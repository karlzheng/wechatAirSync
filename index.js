

var util = require('util');
var bleno = require('bleno');
var wechat = require('./wechat');

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;

console.log('bleno');
var readlocalhost = function() {
    var mac = new Buffer(6);
    for (var i=0; i<6; i++) {
        var hex = parseInt(bleno.address[3*i], 16);
        hex = (hex << 4) + parseInt(bleno.address[3*i+1], 16);
        mac[i] = hex;
    }
    return mac;
};

var localeMACAddr = new Buffer(6);

var ReadOnlyCharacteristic = function() {
  ReadOnlyCharacteristic.super_.call(this, {
    uuid: 'fec9',
    properties: ['read']
  });
};
util.inherits(ReadOnlyCharacteristic, BlenoCharacteristic);

ReadOnlyCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('ReadOnlyCharacteristic Read');
  var result = this.RESULT_SUCCESS;
  var mac = localeMACAddr;
  callback(result, mac);
};

var writeBuf = new Buffer(0);

var WriteOnlyCharacteristic= function() {
  WriteOnlyCharacteristic.super_.call(this, {
    uuid: 'fec7',
    properties: ['write']
  });
};

util.inherits(WriteOnlyCharacteristic, BlenoCharacteristic);

WriteOnlyCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  writeBuf = new Buffer.concat([writeBuf, data]);
  console.log('Write request: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse);
  var ret = wechat.wechat_resp(writeBuf);
  switch(ret[0]) {
    case 20001:
      // console.log("auth resp");
      IndicateCharacteristic.send_data(2);
      writeBuf = new Buffer(0);
      break;
	case 0:
      break;
	default:
      writeBuf = new Buffer(0);
      break;
  }
  callback(this.RESULT_SUCCESS);

  if (ret[0] == 20003) {
	  setTimeout(function() {
		  console.log("after 20003");
		  IndicateCharacteristic.send_data(3);
	  }, 1000);
  }

};


var IndicateCharacteristic = function() {
  IndicateCharacteristic.super_.call(this, {
    uuid: 'fec8',
    properties: ['indicate']
  });
};

util.inherits(IndicateCharacteristic , BlenoCharacteristic);

var updateCallback;
var runStep = 0;
var senddatabuf = [];


IndicateCharacteristic.send_count_data = function() {
	var data = [];

    if (senddatabuf.length > 20) {
        data = senddatabuf.slice(0, 20);
        senddatabuf = senddatabuf.slice(20, senddatabuf.length);
        // console.log(senddatabuf);
        // console.log(data);
	} else if (senddatabuf.length == 0) {
		return ;
    } else {
        data = senddatabuf;
		senddatabuf = [];
    }

    updateCallback(data);
};

IndicateCharacteristic.send_data = function(step) {
    var data = [];
	runStep = step;
	DeviceName = "GumpWX";
    switch(step) {
        case 1:
            senddatabuf = wechat.device_auth(localeMACAddr, DeviceName);
            // console.log(senddatabuf);
            break;
		case 2:
			senddatabuf = wechat.device_init();
            break;

		case 3:
			senddatabuf = wechat.device_SendDataRequest();
            break;
    };
	IndicateCharacteristic.send_count_data();
};

IndicateCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('IndicateCharacteristic subscribe');
  updateCallback = updateValueCallback;
	setTimeout(function() {
		IndicateCharacteristic.send_data(1);
	}, 1000);
};

IndicateCharacteristic.prototype.onUnsubscribe = function() {
  console.log('IndicateCharacteristic unsubscribe');
};

IndicateCharacteristic.prototype.onIndicate = function() {
  console.log('IndicateCharacteristic on indicate');
  IndicateCharacteristic.send_count_data();
};

function SampleService() {
  SampleService.super_.call(this, {
    uuid: 'fee7',
    characteristics: [
      new WriteOnlyCharacteristic(),
      new IndicateCharacteristic(),
      new ReadOnlyCharacteristic()
    ]
  });
}

util.inherits(SampleService, BlenoPrimaryService);

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state + ', address = ' + bleno.address);

  localeMACAddr = readlocalhost();
  if (state === 'poweredOn') {
    var advData = new Buffer([0x02, 0x01, 0x06, 0x03, 0x03, 0xE7, 0xFE, 0x07, 0x09,
		0x47, 0x75, 0x6D, 0x70, 0x57, 0x58, // GumpWX
        0x09, 0xFF, 0x33, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    var mac = localeMACAddr;
    for (var i=0; i<6; i++) {
        advData[19+i] = mac[i];
    }
    bleno.startAdvertisingWithEIRData(advData);
  } else {
    bleno.stopAdvertising();
  }
});

// Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
  console.log('on -> accept, client: ' + clientAddress);

  bleno.updateRssi();
});

bleno.on('disconnect', function(clientAddress) {
  console.log('on -> disconnect, client: ' + clientAddress);
});

bleno.on('rssiUpdate', function(rssi) {
  console.log('on -> rssiUpdate: ' + rssi);
});
//////////////////////////////////////

bleno.on('mtuChange', function(mtu) {
  console.log('on -> mtuChange: ' + mtu);
});

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new SampleService()
    ]);
  }
});

bleno.on('advertisingStop', function() {
  console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function(error) {
  console.log('on -> servicesSet: ' + (error ? 'error ' + error : 'success'));
});

