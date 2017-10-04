/**
 * Simple bleno echo server
 * Author: Shawn Hymel
 * Date: November 22, 2015
 *
 * Creates a Bluetooth Low Energy device using bleno and offers one service
 * with one characteristic. Users can use a BLE test app to read, write, and
 * subscribe to that characteristic. Writing changes the characteristic's
 * value, reading returns that value, and subscribing results in a string
 * message every 1 second.
 *
 * This example is Beerware (https://en.wikipedia.org/wiki/Beerware).
 */

//http://shawnhymel.com/703/bluetooth-low-energy-peripherals-with-javascript/
//url = git@github.com:luluxie/weixin-iot.git

// Using the bleno module
var bleno = require('bleno');
var parser = require('bleadvertise');

var DEVICE_NAME = '微信互联硬件';
process.env['BLENO_DEVICE_NAME'] = DEVICE_NAME;
var BLE_LOCAL_NAME = 'KarlZhengBLE';
var DEVICE_COMPANY_ID = '013A';

var WX_SERVICE_UUID      = 'FEE7';
var WERUN_PEDOMETER_UUID = 'FEA1';
var WERUN_TARGET_UUID    = 'FEA2';
var WX_CHARC_UUID_READ   = 'FEC9';

// Once bleno starts, begin advertising our BLE address
bleno.on('stateChange', function(state) {
    console.log('State change: ' + state);
	DEVICE_MAC_ADDR = bleno.address.replace(/:/g,'');
    if (state === 'poweredOn') {
		//bleno.startAdvertising('KarlZhengDev',['12ab']);
		var data = {
			flags : [0x04],
			incompleteUUID16 : [ WX_SERVICE_UUID ],
			completeName : BLE_LOCAL_NAME,
			mfrData : new Buffer(DEVICE_COMPANY_ID + DEVICE_MAC_ADDR, 'hex')
		};
		var advertisementData = parser.serialize(data);
		bleno.startAdvertisingWithEIRData(advertisementData, null);
    } else {
        bleno.stopAdvertising();
    }
});

// Notify the console that we've accepted a connection
bleno.on('accept', function(clientAddress) {
    console.log("Accepted connection from address: " + clientAddress);
});

// Notify the console that we have disconnected from a client
bleno.on('disconnect', function(clientAddress) {
    console.log("Disconnected from address: " + clientAddress);
});

// When we begin advertising, create a new service and characteristic
bleno.on('advertisingStart', function(error) {
	if (error) {
		console.log("Advertising start error:" + error);
	} else {
		console.log("Advertising start success");
		bleno.setServices([
				new bleno.PrimaryService({
					uuid : WX_SERVICE_UUID,

					characteristics : [
						new bleno.Characteristic({
							value : null, uuid : WERUN_PEDOMETER_UUID,
							//properties : ['notify', 'read', 'write'],
							properties : ['indicate', 'read'],
							onSubscribe : function(maxValueSize, updateValueCallback) {
								console.log("Device subscribed");
								this.changeInterval = setInterval(function() {
										var data = new Buffer('01' + '752E00', 'hex');
										//var data = new Buffer([0x01, 0x01, 0x00, 0x00]);
										console.log('WeRunPedoMeterChar update value: 0x' + data.toString('hex'));
										updateValueCallback(data);
								}, 1000);
							},

							// If the client unsubscribes, we stop broadcasting the message
							onUnsubscribe : function() {
								if (this.changeInterval) {
									clearInterval(this.changeInterval);
									this.changeInterval = null;
								}
							},

							// Send a message back to the client with the characteristic's value
							onReadRequest : function(offset, callback) {
								console.log("Read request received");
								//var data = new Buffer('01' + '752E00', 'hex');
								var data = new Buffer([0x01, 0x01, 0x00, 0x00]);
								//var head = new Buffer('fe01000c27120003', 'hex');
								//console.log(data.toString("utf-8"));
								console.log(data);
								//callback(this.RESULT_SUCCESS, data.toString("utf-8"));
								callback(this.RESULT_SUCCESS, data);
							},

							onWriteRequest : function(data, offset, withoutResponse, callback) {
								this.value = data;
								console.log('Write request: value = ' + this.value.toString("utf-8"));
								callback(this.RESULT_SUCCESS);
							}

						}),

						new bleno.Characteristic({ value : null, uuid : WERUN_TARGET_UUID, properties : [ 'read', 'indicate', 'write' ], //properties : ['notify', 'read', 'write'],
							// If the client subscribes, we send out a message every 1 second
							onSubscribe : function(maxValueSize, updateValueCallback) {
								console.log("Device subscribed");
								this.intervalId = setInterval(function() {
									var data = new Buffer('01' + '752E00', 'hex');
									console.log('WeRunTargetChar update value: 0x' + data.toString('hex'));
									updateValueCallback(data);
								}, 1000);
							},
							// If the client unsubscribes, we stop broadcasting the message
							onUnsubscribe : function() {
								console.log('WeRunTargetChar unsubscribe');
								if (this.changeInterval) {
									clearInterval(this.changeInterval);
									this.changeInterval = null;
								}
							},

							// Send a message back to the client with the characteristic's value
							onReadRequest : function(offset, callback) {
								console.log("Read request received");
								// 29998 steps
								var data = new Buffer('01' + '752E00', 'hex');
								//callback(this.RESULT_SUCCESS, data.toString("utf-8"));
								callback(this.RESULT_SUCCESS, data);
							},

							// Accept a new value for the characterstic's value
							onWriteRequest : function(data, offset, withoutResponse, callback) {
								this.value = data;
								console.log('Write request: value = ' + this.value.toString("utf-8"));
								callback(this.RESULT_SUCCESS);
							}
						}),

						new bleno.Characteristic({ value : null, uuid : WX_CHARC_UUID_READ, properties : [ 'read' ], value : new Buffer(DEVICE_MAC_ADDR, 'hex') })
					]
				})
		]);
	}
});
