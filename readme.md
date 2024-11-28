# Solar Influx

Pulls data from the Fronius API and sends it to an Influx DB server.

It's not really ready for public use but if you want to give it a try, set the following environment variables and start it by running `node solar.mjs`

```sh
export INFLUXDB_URL="http://your-server:8086"
export INFLUXDB_TOKEN="your long secret token"
export FR_USERNAME="the email address you use in the Fronius app (solarweb)"
export FR_PASSWORD="the password you use in the Fronius app (solarweb)"
export FR_ACCESS_KEY_ID="This is secret. They will give it out to businesses though."
export FR_ACCESS_KEY_VALUE="This is secret. They will give it out to businesses though."
export FR_SYSTEM_ID="the id of your inverter"
```