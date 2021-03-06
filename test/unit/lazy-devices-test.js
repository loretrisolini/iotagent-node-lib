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
    async = require('async'),
    apply = async.apply,
    should = require('should'),
    logger = require('fiware-node-logger'),
    nock = require('nock'),
    mongoUtils = require('./mongoDBUtils'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
                commands: [],
                lazy: [
                    {
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            },
            'Termometer': {
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                active: [
                ]
            },
            'Motion': {
                commands: [],
                lazy: [
                    {
                        name: 'moving',
                        type: 'Boolean'
                    }
                ],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: []
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light'
    },
    device2 = {
        id: 'motion1',
        type: 'Motion'
    };

describe('IoT Agent Lazy Devices', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');
        mongoUtils.cleanDbs(done);
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(function() {
                mongoUtils.cleanDbs(done);
            });
        });
    });

    describe('When the IoT Agent receives an update on the device data in JSON format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Light',
                        isPattern: 'false',
                        id: 'light1:Light',
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'Percentage',
                                value: '12'
                            }
                        ]
                    }
                ],
                updateAction: 'APPEND'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/updateInformationResponse.json');

            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id + ':' + device1.type);
                type.should.equal(device1.type);
                attributes[0].value.should.equal('12');
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When the IoT Agent receives an update on the device data in XML format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            body: utils.readExampleFile('./test/unit/contextRequests/updateContext.xml', true),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens',
                'content-type': 'application/xml'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id + ':' + device1.type);
                type.should.equal(device1.type);
                attributes[0].value.should.equal('12');
                handlerCalled = true;
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });

        it('should return the response in XML Format', function(done) {
            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                response.headers['content-type'].should.match(/application\/xml.*/);
                done();
            });
        });
    });

    describe('When the IoT Agent receives a query on the device data in XML format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
            method: 'POST',
            body: utils.readExampleFile('./test/unit/contextRequests/queryLights.xml', true),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens',
                'content-type': 'application/xml'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id + ':' + device1.type);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                handlerCalled = true;
                callback(null, {
                        id: id,
                        type: type,
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'string',
                                value: '89'
                            }
                        ]
                    });
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });

        it('should return the response in XML format', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function testQueryHandler(id, type, attributes, callback) {
                handlerCalled = true;
                callback(null, {
                    id: id,
                    type: type,
                    attributes: [
                            {
                                name: 'dimming',
                                type: 'string',
                                value: '89'
                            }
                        ]
                    });
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                response.headers['content-type'].should.match(/application\/xml.*/);
                body.should.match(/<queryContextResponse>/);
                body.should.match(/<entityId type="Light" isPattern="false">/);
                body.should.match(/<name>dimming<\/name>/);
                done();
            });
        });
    });

    describe('When a IoT Agent receives an update on multiple contexts', function() {
        it('should call the device handler for each of the contexts');
    });

    describe('When a context query arrives to the IoT Agent', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1:Light'
                        }
                    ],
                    attributes: [
                        'dimming'
                    ]
                }
            },
            sensorData = [
                {
                    id: 'light1:Light',
                    isPattern: false,
                    type: 'Light',
                    attributes: [
                        {
                            name: 'dimming',
                            type: 'Percentage',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information querying the underlying devices', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id + ':' + device1.type);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent without any attributes', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1:Light'
                        }
                    ]
                }
            },
            sensorData = [
                {
                    id: 'light1:Light',
                    isPattern: false,
                    type: 'Light',
                    attributes: [
                        {
                            name: 'temperature',
                            type: 'centigrades',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information of all the attributes', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationResponseEmptyAttributes.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent with an empty attributes array', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1:Light'
                        }
                    ],
                    attributes: []
                }
            },
            sensorData = [
                {
                    id: 'light1:Light',
                    isPattern: false,
                    type: 'Light',
                    attributes: [
                        {
                            name: 'temperature',
                            type: 'centigrades',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information of all the attributes', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationResponseEmptyAttributes.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent for a type with static attributes', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Motion',
                            isPattern: 'false',
                            id: 'motion1:Motion'
                        }
                    ],
                    attributes: [
                        'moving',
                        'location'
                    ]
                }
            },
            sensorData = [
                {
                    id: 'motion1:Motion',
                    type: 'Motion',
                    attributes: [
                        {
                            name: 'moving',
                            type: 'Boolean',
                            value: 'true'
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent2.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device2)
            ], done);
        });

        it('should return the information adding the static attributes', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationStaticAttributesResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                id.should.equal('motion1:Motion');
                type.should.equal('Motion');
                attributes[0].should.equal('moving');
                attributes[1].should.equal('location');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent with a payload that is not XML nor JSON', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                body: 'This is a body in text format',
                headers: {
                    'Content-Type': 'text/plain'
                }
            },
            sensorData = [
                {
                    id: 'light1:Light',
                    type: 'Light',
                    attributes: [
                        {
                            name: 'dimming',
                            type: 'Percentage',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent with an invalid body', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {}
            },
            sensorData = [
                {
                    id: 'light1:Light',
                    type: 'Light',
                    attributes: [
                        {
                            name: 'dimming',
                            type: 'Percentage',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });
    });
});
