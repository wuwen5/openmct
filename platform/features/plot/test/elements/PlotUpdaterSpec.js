/*global define,Promise,describe,it,expect,beforeEach,waitsFor,jasmine,Float32Array*/

/**
 * MergeModelsSpec. Created by vwoeltje on 11/6/14.
 */
define(
    ["../../src/elements/PlotUpdater"],
    function (PlotUpdater) {
        "use strict";

        describe("A plot updater", function () {
            var mockSubscription,
                testDomain,
                testRange,
                testDomainValues,
                testRangeValues,
                updater;

            function makeMockDomainObject(id) {
                var mockDomainObject = jasmine.createSpyObj(
                    "object-" + id,
                    [ "getId", "getCapability", "getModel" ]
                );
                mockDomainObject.getId.andReturn(id);
                return mockDomainObject;
            }

            beforeEach(function () {
                var ids = [ 'a', 'b', 'c' ],
                    mockObjects = ids.map(makeMockDomainObject);

                mockSubscription = jasmine.createSpyObj(
                    "subscription",
                    [ "getDomainValue", "getRangeValue", "getTelemetryObjects" ]
                );
                testDomain = "testDomain";
                testRange = "testRange";
                testDomainValues = { a: 3, b: 7, c: 13 };
                testRangeValues = { a: 123, b: 456, c: 789 };

                mockSubscription.getTelemetryObjects.andReturn(mockObjects);
                mockSubscription.getDomainValue.andCallFake(function (mockObject) {
                    return testDomainValues[mockObject.getId()];
                });
                mockSubscription.getRangeValue.andCallFake(function (mockObject) {
                    return testRangeValues[mockObject.getId()];
                });

                updater = new PlotUpdater(
                    mockSubscription,
                    testDomain,
                    testRange,
                    1350 // Smaller max size for easier testing
                );
            });

            it("provides one buffer per telemetry object", function () {
                expect(updater.getBuffers().length).toEqual(3);
            });

            it("changes buffer count if telemetry object counts change", function () {
                mockSubscription.getTelemetryObjects
                    .andReturn([makeMockDomainObject('a')]);
                updater.update();
                expect(updater.getBuffers().length).toEqual(1);
            });

            it("maintains a buffer of received telemetry", function () {
                // Count should be large enough to trigger a buffer resize
                var count = 750,
                    i;

                // Increment values exposed by subscription
                function increment() {
                    Object.keys(testDomainValues).forEach(function (k) {
                        testDomainValues[k] += 1;
                        testRangeValues[k] += 1;
                    });
                }

                // Simulate a lot of telemetry updates
                for (i = 0; i < count; i += 1) {
                    updater.update();
                    expect(updater.getLength(0)).toEqual(i + 1);
                    expect(updater.getLength(1)).toEqual(i + 1);
                    expect(updater.getLength(2)).toEqual(i + 1);
                    increment();
                }

                // Domain offset should be lowest domain value
                expect(updater.getDomainOffset()).toEqual(3);

                // Test against initial values, offset by count,
                // as was the case during each update
                for (i = 0; i < count; i += 1) {
                    expect(updater.getBuffers()[0][i * 2])
                        .toEqual(3 + i - 3);
                    expect(updater.getBuffers()[0][i * 2 + 1])
                        .toEqual(123 + i);
                    expect(updater.getBuffers()[1][i * 2])
                        .toEqual(7 + i - 3);
                    expect(updater.getBuffers()[1][i * 2 + 1])
                        .toEqual(456 + i);
                    expect(updater.getBuffers()[2][i * 2])
                        .toEqual(13 + i - 3);
                    expect(updater.getBuffers()[2][i * 2 + 1])
                        .toEqual(789 + i);
                }
            });

            it("can handle delayed telemetry object availability", function () {
                // The case can occur where getTelemetryObjects() returns an
                // empty array - specifically, while objects are still being
                // loaded. The updater needs to be able to cope with that
                // case.
                var tmp = mockSubscription.getTelemetryObjects();
                mockSubscription.getTelemetryObjects.andReturn([]);

                // Reinstantiate with the empty subscription
                updater = new PlotUpdater(
                    mockSubscription,
                    testDomain,
                    testRange
                );

                // Should have 0 buffers for 0 objects
                expect(updater.getBuffers().length).toEqual(0);

                // Restore the three objects the test subscription would
                // normally have.
                mockSubscription.getTelemetryObjects.andReturn(tmp);
                updater.update();

                // Should have 3 buffers for 3 objects
                expect(updater.getBuffers().length).toEqual(3);
            });


            it("shifts buffer upon expansion", function () {
                // Count should be large enough to hit buffer's max size
                var count = 1400,
                    i;

                // Initial update; should have 3 in first position
                // (a's initial domain value)
                updater.update();
                expect(updater.getBuffers()[0][1]).toEqual(123);

                // Simulate a lot of telemetry updates
                for (i = 0; i < count; i += 1) {
                    testDomainValues.a += 1;
                    testRangeValues.a += 1;
                    updater.update();
                }

                // Value at front of the buffer should have been pushed out
                expect(updater.getBuffers()[0][1]).not.toEqual(123);
            });
        });
    }
);