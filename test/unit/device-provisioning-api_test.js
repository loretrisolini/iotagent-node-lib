/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),

    should = require('should'),
    nock = require('nock'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Device provisioning API: Provision devices', function() {
    beforeEach(function(done) {
        nock.cleanAll();

        iotAgentLib.activate(iotAgentConfig, function() {
            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile(
                    './test/unit/contextAvailabilityRequests/registerProvisionedDevice.json'))
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function(done) {
        nock.cleanAll();

        iotAgentLib.deactivate(done);
    });

    describe('When a device provisioning request with all the required data arrives to the IoT Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should add the device to the devices list', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    results.length.should.equal(1);
                    done();
                });
            });
        });
        it('should store the device with the provided entity id, name and type', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    results[0].id.should.equal('Light1');
                    results[0].name.should.equal('TheFirstLight');
                    results[0].type.should.equal('TheLightType');
                    done();
                });
            });
        });
        it('should store the device with the per device information', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    should.exist(results[0].timezone);
                    results[0].timezone.should.equal('America/Santiago');
                    should.exist(results[0].lazy);
                    results[0].lazy.length.should.equal(1);
                    results[0].lazy[0].name.should.equal('luminance');
                    should.exist(results[0].staticAttributes);
                    results[0].commands.length.should.equal(1);
                    results[0].commands[0].name.should.equal('commandAttr');
                    should.exist(results[0].staticAttributes);
                    results[0].staticAttributes.length.should.equal(1);
                    results[0].staticAttributes[0].name.should.equal('hardcodedAttr');
                    should.exist(results[0].active);
                    results[0].active.length.should.equal(1);
                    results[0].active[0].name.should.equal('attr_name');
                    should.exist(results[0].internalAttributes);
                    results[0].internalAttributes.length.should.equal(1);
                    results[0].internalAttributes[0].customField.should.equal('customValue');
                    done();
                });
            });
        });
        it('should store service and subservice info from the headers along with the device data', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    should.exist(results[0].service);
                    results[0].service.should.equal('smartGondor');
                    should.exist(results[0].subservice);
                    results[0].subservice.should.equal('/gardens');
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request with the minimum required data arrives to the IoT Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            done();
        });

        it('should add the device to the devices list', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    results.length.should.equal(1);
                    done();
                });
            });
        });
        it('should store the device with the provided entity id, name and type', function(done) {
            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    results[0].id.should.equal('MicroLight1');
                    results[0].name.should.equal('FirstMicroLight');
                    results[0].type.should.equal('MicroLights');
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request with missing data arrives to the IoT Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionDeviceMissingParameters.json')
        };

        it('should raise a MISSING_ATTRIBUTES error, indicating the missing attributes', function(done) {
            request(options, function(error, response, body) {
                should.exist(body);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_ATTRIBUTES');
                body.message.should.match(/.*entity_type.*/);
                done();
            });
        });
    });
    describe('When two device provisioning requests with the same service and Device ID arrive', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function(done) {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile(
                    './test/unit/contextAvailabilityRequests/registerProvisionedDevice.json'))
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            done();
        });

        it('should raise a DUPLICATE_ID error, indicating the ID was already in use', function(done) {
            request(options, function(error, response, body) {
                request(options, function(error, response, body) {
                    should.exist(body);
                    response.statusCode.should.equal(400);
                    body.name.should.equal('DUPLICATE_DEVICE_ID');
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request is missing the "name" attribute', function() {
        it('should raise a MISSING_ATTRIBUTES error, indicating the missing attributes');
    });
    describe('When an agent is activated with a different base root', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/newBaseRoot/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json')
        };

        beforeEach(function(done) {
            iotAgentLib.deactivate(function() {
                iotAgentConfig.server.baseRoot = '/newBaseRoot';
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function() {
            iotAgentConfig.server.baseRoot = '/';
        });

        it('should listen to requests in the new root', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                iotAgentLib.listDevices('smartGondor', '/gardens', function(error, results) {
                    results.length.should.equal(1);
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request without the mandatory headers arrives to the Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {},
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionDeviceMissingParameters.json')
        };

        it('should raise a MISSING_HEADERS error, indicating the missing attributes', function(done) {
            request(options, function(error, response, body) {
                should.exist(body);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
});
