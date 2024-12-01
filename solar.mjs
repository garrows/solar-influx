import { InfluxDB, Point } from '@influxdata/influxdb-client';

const token = process.env.INFLUXDB_TOKEN;
const url = process.env.INFLUXDB_URL;

const client = new InfluxDB({ url, token });

let org = `arrowsmith`
let bucket = `solar`
let jwt = null;
const AccessKeyId = process.env.FR_ACCESS_KEY_ID;
const AccessKeyValue = process.env.FR_ACCESS_KEY_VALUE;
const systemId = process.env.FR_SYSTEM_ID;

let writeClient = client.getWriteApi(org, bucket, 'ns');

async function getJwtToken() {
    const url = 'https://api.solarweb.com/swqapi/iam/jwt';
    const payload = {
        userId: process.env.FR_USERNAME,
        password: process.env.FR_PASSWORD
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                AccessKeyId,
                AccessKeyValue,
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const body = await response.text();
            console.log(body);
            console.error(`HTTP error! Status: ${response.status}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // waits for 1 second
            return await getJwtToken();
        }

        const data = await response.json();
        console.log('JWT Token:', data);
        return data;
    } catch (error) {
        console.error('Error fetching JWT token:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // waits for 1 second
        return await getJwtToken();
    }
}

async function getDataAPI(timestamp) {
    const res = await fetch(`https://api.solarweb.com/swqapi/pvsystems/${systemId}/flowdata`, {
        headers: {
            Authorization: `Bearer ${jwt.jwtToken}`,
            AccessKeyId,
            AccessKeyValue,
        },
        redirect: 'manual'
    });
    if (res.status >= 300 && res.status < 500) {
        console.log('Reauthing');
        jwt = await getJwtToken();
        return await getDataAPI(timestamp);
    }
    if (res.status != 200) {
        throw new Error("Unhandeled http response: " + res.status);
    }
    const data = await res.json();
    return data;
}

async function main() {
    let data;
    try {
        data = await getDataAPI();
    } catch (ex) {
        console.error(ex);
        return;
    }
    const { isOnline } = data.status;
    if (isOnline) {
        const { logDateTime, channels } = data.data;

        const solar = channels.find(c => c.channelName === 'PowerPV');
        const load = channels.find(c => c.channelName === 'PowerLoad');
        const grid = channels.find(c => c.channelName === 'PowerFeedIn');

        console.log(logDateTime, solar.value, load.value, grid.value);
        const point = new Point('solardata')
            .tag('location', 'home')
            .floatField('solar', solar?.value || 0)
            .floatField('load', load?.value || 0)
            .floatField('grid', grid?.value || 0)
            .booleanField('online', isOnline)
            .timestamp(new Date(logDateTime))
        await writeClient.writePoint(point)
    } else {
        console.log('Offline', data);
        const point = new Point('solardata')
            .tag('location', 'home')
            .booleanField('online', isOnline)
        await writeClient.writePoint(point)
    }

    await writeClient.flush()
}
jwt = await getJwtToken();
await main();
setInterval(main, 5000);
