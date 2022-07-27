# mediasoup-cli
##### JavaScript cli tool for monitoring mediasoup server applications.


### Features
- Showing current object workers , routers , transports ... 
- Real time logging object workers , routers , transports  ... 
##### !Notice : this tool only reflect data based on your  app if you didn't close router it will still appear in the cli
##### !Notice : this toole require mediasoup 3
#
## install


```sh
yarn add mediasoup-cli
or 
npm i mediasoup-cli
```
## Usage


```sh
const mediasoup = require("mediasoup");
const mediaSoupCli = require("mediasoup-cli");
//or
import mediaSoupCli from "mediasoup-cli";

//pass mediasoup instance to observer function
mediaSoupCli.observer(mediasoup)
```

##### this tool use socket.io on port 5462 if it conflict with port you use you can specify port like this
#
```sh

mediaSoupCli.observer(mediasoup,{
  PORT:"4568"
})
```
open new terminal window in the same app root directory 
starting the cli using command
```sh
npx mediasoup-cli
```


#### command expmple
```sh
show workers //display all current active worker
show routers //display all current active router
show transport routerid=2546855 //display all current active worker
show consumer transportid=2546855 //display all current active worker
```
### monitor in real time
```sh
watch routers 
watch transport routerid=2546855 
watch transport routerid=2546855 
watch consumer transportid=2546855 
```

```sh
        [options] [ object ] 
        [options] [ object ]  [arguments]

options:
- show        use to show list of current objects ex : workers , routers 
- watch       use to moniter objects in real time

arguments:
--workerId       worker id example : show routers --workerId=565422
--routerId       worker id example : show routers --routerId=565422```
```

