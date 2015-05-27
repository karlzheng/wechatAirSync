var util = require('util');
var bleno = require('bleno');
var wechat = require('./wechat');

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;

console.log('bleno');
var LocaleMACAddr = new Buffer([0x28, 0xE3, 0x47, 0x65, 0x36, 0x39]);
var DeviceIdName = "Sulong";

var IndicateCharacteristics = function() {
  IndicateCharacteristics.super_.call(this, {
    uuid: 'fec8',
    properties: ['indicate']
  });
};

util.inherits(IndicateCharacteristics, BlenoCharacteristic);

var updateCallback;
var count = 0;
var senddatabuf = [];

var test = function() {
    wechat.device_auth(LocaleMACAddr, "WeChatBluetoothDevice");
};

IndicateCharacteristics.send_data = function() {
    var data = [];
    switch(count) {
        case 1:
            senddatabuf = wechat.device_auth(LocaleMACAddr, DeviceIdName);
            // console.log(senddatabuf);
            break;
    };
    if (count < 100) {
        count = count + 1;
    }
    if (senddatabuf.length > 20) {
        data = senddatabuf.slice(0, 20);
        senddatabuf = senddatabuf.slice(20, senddatabuf.length);
        // console.log(senddatabuf);
        // console.log(data);
    } else {
        data = senddatabuf;
    }
    updateCallback(data);
};

IndicateCharacteristics.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('IndicateCharacteristics subscribe ');
  updateCallback = updateValueCallback;
  count = 1;
  setTimeout(function() {
      IndicateCharacteristics.send_data();
  }, 1000);
};

IndicateCharacteristics.prototype.onUnsubscribe  = function() {
  console.log('IndicateCharacteristics unsubscribe');
};

IndicateCharacteristics.prototype.onIndicate = function() {
  console.log('IndicateCharacteristics on indicate');
  if (count == 2) {
      IndicateCharacteristics.send_data();
  }
};

var WriteCharacteristics = function() {
  WriteCharacteristics.super_.call(this, {
    uuid: 'fec7',
    properties: ['write']
  });
};

util.inherits(WriteCharacteristics, BlenoCharacteristic);

WriteCharacteristics.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log('WriteCharacteristics write request: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse);

  callback(this.RESULT_SUCCESS);
};

var ReadCharacteristics = function() {
  ReadCharacteristics.super_.call(this, {
      uuid: 'fec9',
      properties: ['read'],
      value: LocaleMACAddr,  // 虚拟的MAC地址
  });
};
util.inherits(ReadCharacteristics, BlenoCharacteristic);

function WechatService() {
  WechatService.super_.call(this, {
    uuid: 'fee7',
    characteristics: [
      new WriteCharacteristics(),
      new IndicateCharacteristics(),
      new ReadCharacteristics(),
    ]
  });
}

util.inherits(WechatService, BlenoPrimaryService);

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('Sulong', ['fee7']);
  } else {
    bleno.stopAdvertising();
  }
});

// Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
  console.log('on -> accept, client: ' + clientAddress);

  if (bleno.updateRssi) {
    bleno.updateRssi();
  }
});

bleno.on('disconnect', function(clientAddress) {
  console.log('on -> disconnect, client: ' + clientAddress);
  process.exit();
});

bleno.on('rssiUpdate', function(rssi) {
  console.log('on -> rssiUpdate: ' + rssi);
});
//////////////////////////////////////

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new WechatService(),
    ]);
  }
});

bleno.on('advertisingStop', function() {
  console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function() {
  console.log('on -> servicesSet');
});
