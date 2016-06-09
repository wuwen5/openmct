## Notes
API is notional for now, based on use-cases identified below. Possible the 
use cases are not sufficient, so please include in comments 
any other use cases you'd like to see. 

Plan now is to start building out test suite for the use cases identified below
in order to get the API functional. Need to discuss how UI aspects of timeline will be implemented.
Propose in place refactoring of existing timeline rather than starting again.

Some caveats / open questions
* I don't understand the use case shown on page 52 of UI sketches. It shows RT/FT, with deltas, 
with inner interval unlocked. Not sure what result would be, has inner end switched to fixed?
Also example on page 55 in real-time where inner end < now. Is there a use case for this? Semantically, it's saying
show me real time, but stale data. Why would a user want this? My feeling is that if the inner 
OR outer ends are moved behind NOW in real-time mode then you drop into historical mode.
* For the API itself, have ignored question of how it's namespaced / exposed. 
Examples assume global namespace and availability from window object. 
For now API implemented as standard standard Require JS AMDs. Could attach 
to window from bundle.js. Perhaps attaching to window not best approach though...
* Have not included validation (eg. start time < end time) or any other 
business logic such as what happens when outer interval gets dragged 
within range of inner interval. Focus is on teasing out the public API 
right now. 
* Time systems are vague right now also, I don't know how they're going 
to work or whether any API has yet been specified.
* Not clear on the differences between real-time and follow-time as it 
concerns the time conductor? For now the API has an end bounds mode
of FOLLOW which automatically tracks current time, and a start time mode 
of RELATIVE. I can envision a real-time plot that is not in follow time mode, 
but not sure what implication is for time conductor itself and how it 
differs from an historical plot?
* Should the time conductor be responsible for choosing time system / domain? Currently 
it is.

## Use Cases
### 'Plugin'
1. Plugin view responds to change in TOI
2. Plugin view updated on tick
3. Plugin view updated when user changes (inner) bounds
4. New plugin component requests 'static'(ie. non-streaming) time domain 
data from some custom data source and sets conductor bounds to the start 
and end dates of the data.
5. Plugin component loads real-time data sourc and wants to switch time 
conductor into real-time mode.

### Platform
1. User changes time of interest
3. Conductor controller needs to update bounds and mode on TC when user changes bounds

### Additional possible use-cases
1. Telemetry adapter wants to indicate presence of data at a particular time
2. Time conductor controller wants to paint map of data availability.

These use-cases could be features of the TimeConductor, but perhaps makes 
sense to make knowledge of data availability the sole preserve of telemetry 
adapters, not TimeConductor itself. Adapters will be ultimately responsible 
for providing these data so doesn't make much sense to duplicate elsewhere.
The TimeConductorController - which knows tick interval on scale (which 
TimeConductor API does not) - could simply request data availability from 
telemetry API and paint it into the Time Conductor UI

## Example implementations of use cases
### 'Plugin'

#### 1. Plugin view responds to change in TOI
``` javascript
MCT.conductor.listen('time-of-interest', function (timeOfInterest) {
    plot.timeOfInterest(timeOfInterest);
});
```
#### 2. Plugin view updated on tick
``` javascript
MCT.conductor.listen('bounds', function (bounds, eventType) {
    plotUpdater.setDomainBounds(bounds.start, bounds.end);
}, MCT.conductor.EventTypes.TICK);
```
#### 3. Plugin view updated when user changes (inner) bounds
``` javascript
MCT.conductor.listen('bounds', function (bounds, eventType) {
    plotUpdater.setDomainBounds(bounds.start, bounds.end);
}, MCT.conductor.EventTypes.USER);
```
#### 4. New plugin component requests 'static'(ie. non-streaming) time domain data 
Data is from custom data source, and plugin and sets conductor bounds to 
the start and end dates of the data.
``` javascript
function loadPlan(plan) {
    MCT.conductor.timeSystem(plan.metadata.timeSystem);
    
    //This could be the default mode, rendering this step unnecessary.
    MCT.conductor.mode(new FixedDatesMode());
    MCT.conductor.start(plan.activities[0].date());
    MCT.conductor.end(plan.activities[plan.activities.length-1].date());
}
```
#### 5. New plugin component requests 'real-time'(ie. streaming) time domain data 
Data is from custom data source, and high frequency, so plugin wants time 
conductor to show only last 30 seconds, rather than default of 15 minutes. 
``` javascript
function loadPlan(plan) {
    var THIRTY_SECONDS = 30 * 1000,
        realtimeMode = new RealtimeMode(-THIRTY_SECONDS);
    MCT.conductor.mode(realtimeMode);
}
```

### Platform

Platform cases differ. Will use public API, but public API not used for setting outer bounds.

1. User changes time of interest
2. Object is loaded and inner and outer bounds are set
3. Conductor controller responds to user draging inner bounds handle
4. Conductor controller needs to update bounds when user sets outer bounds explicitly

####  1. User changes time of interest
```javascript
//Somewhere in the TimeConductorController...
function changeTOI(newTime) {
    MCT.conductor.timeOfInterest(newTime);
}
```

#### 2. Object is loaded and inner and outer bounds are set

#### 3. Conductor controller responds to user draging inner bounds handle
```javascript

function dragInnerStartHandle(finalPos){
    var startTime = positionToTime(finalPos);
    MCT.conductor.start(startTime);
}

function dragInnerEndHandle(finalPos){
    var endTime = positionToTime(finalPos);
    MCT.conductor.end(startTime);
}

function toggleRealtimeMode(mode){
    if (mode === 'realtime') {
        // Set end mode to 'realtime'. This means that times specified 
        // are relative to now.
        MCT.conductor.mode(new RealtimeMode());
    }
}

```

#### 4. Conductor controller needs to update bounds when user sets outer bounds explicitly
//Just set outer bounds, or also set inner bounds?