'use client'

import React from 'react'
import type { CesiumType } from '../types/cesium'
import type { Viewer, PointPrimitive, PointPrimitiveCollection } from 'cesium';
import type { TLE } from '../types/TLE';
//NOTE: This is required to get the stylings for default Cesium UI and controls
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Constants, Elements, Sgp4 } from '@/sgp4/bindings/sgp4/sgp4';
import { bindings } from '@/sgp4';

export interface SatMetadata {
    satName: string,
    noradID: string,
    sgp4Constants: Constants,
    sgp4Elements: Elements,
    TLEEpochTs: number,
    idx: number
}

export const CesiumComponent: React.FunctionComponent<{
    CesiumJs: CesiumType,
    TLEs: TLE[]
}> = ({
    CesiumJs,
    TLEs
}) => {
    const cesiumViewer = React.useRef<Viewer | null>(null);
    const cesiumContainerRef = React.useRef<HTMLDivElement>(null);
    const pointsCollectionRef = React.useRef<PointPrimitiveCollection | null>(null);
    const pointsCollectionPrimitivesRef = React.useRef<PointPrimitive[] | null>(null);
    const pointsMetadataRef = React.useRef<SatMetadata[] | null>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [sgp4Module, setSgp4Module] = React.useState<Sgp4 | null>(null);

    React.useEffect(() => {
        //Load Cesium
        if (cesiumViewer.current === null && cesiumContainerRef.current) {
            //NOTE: Always utilize CesiumJs; do not import them from "cesium"
            cesiumViewer.current = new CesiumJs.Viewer(cesiumContainerRef.current);

            //Setting up Cesium to animate...
            cesiumViewer.current.clock.clockStep = CesiumJs.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            cesiumViewer.current.clock.canAnimate = true;
            cesiumViewer.current.clock.shouldAnimate = true;

            //TLEs are good for about 3 days from its epoch... we're setting the time & limiting time here on purpose.
            cesiumViewer.current.clock.startTime = CesiumJs.JulianDate.fromDate(new Date('2024-04-14T00:00:00.000Z'));
            cesiumViewer.current.clock.stopTime = CesiumJs.JulianDate.fromDate(new Date('2024-04-17T00:00:00.000Z'));
            cesiumViewer.current.clock.currentTime = CesiumJs.JulianDate.fromDate(new Date('2024-04-14T00:00:00.000Z'));

            //Let's make it move fast because it's impressive...
            cesiumViewer.current.clock.multiplier = 300;
            
            //Limiting the zoom
            cesiumViewer.current.scene.screenSpaceCameraController.minimumZoomDistance = (6378.135 * 1000) + 500000; //Earth radius in meters + 500km
            cesiumViewer.current.scene.screenSpaceCameraController.maximumZoomDistance = 0.5E9; //Enough to view very large orbits

            //Enable lighting
            cesiumViewer.current.scene.globe.enableLighting = true;
        }
        //Load SGP4 Propagator
        if (sgp4Module === null){
            bindings.sgp4().then(res => setSgp4Module(res));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (isLoaded) return;
        if (cesiumViewer.current !== null && sgp4Module !== null && TLEs.length) {
            //Add a new PointsPrimitiveCollection. This has better performance than Entities. Assign to variable.
            const newPointsCollection = cesiumViewer.current.scene.primitives.add(new CesiumJs.PointPrimitiveCollection());
            const entitiesCollection = cesiumViewer.current.entities;
            
            const matchingIndexMetadata: SatMetadata[] = [];

            const cesiumClock = cesiumViewer.current.clock;
            const startDate = CesiumJs.JulianDate.toDate(cesiumClock.startTime);

            //An index counter to record when an item has been pushed
            let tempIdx = 0;

            //Let's start processing TLEs. Each item in this array has 3 lines;
            //a TLE/3LE. It has bunch of data we need to place a rough position of a space object.
            TLEs.forEach(TLE => {
                //Make sure TLE line 1 and 2 exist as they're vital
                if (typeof TLE[1] === 'string' && typeof TLE[2] === 'string') {
                    //Get the Satellite name from 1st line minus "0 " which is used to indiciate nth line
                    const satName = typeof TLE[0] === 'string' && TLE[0].length > 2 ? TLE[0].slice(2, TLE[0].length) : 'Unknown name';
                    const noradID = TLE[2].length > 8 ? TLE[2].slice(2,7) : 'Unknown ID';
                    //Create satellite elements needed to propagate / estimate trajectory
                    const sgp4Elements = Elements.fromTle(sgp4Module, satName, TLE[1], TLE[2]);
                    //Making sure elements were properly parsed...
                    if (sgp4Elements.tag === 'ok') {
                        //Get TLE Epoch Time; this value will be used later during propagation.
                        const TLEEpoch = sgp4Elements.val.getDatetime();
                        const TLEEpochTs = (Number(TLEEpoch.secs) * 1000) + (TLEEpoch.nsecs / 1000000);
                        //Create constants required for propagation.
                        const sgp4Constants = Constants.fromElements(sgp4Module, sgp4Elements.val);
                        //Making sure constants were properly created...
                        if (sgp4Constants.tag === 'ok') {
                            //We'll do something fun with this... check below
                            const isISS = noradID === '25544';

                            //We add a white point to the Points Collection in Cesium
                            newPointsCollection.add({
                                position: new CesiumJs.Cartesian3(),
                                color: isISS ? CesiumJs.Color.CORAL : CesiumJs.Color.WHITE,
                                pixelSize: isISS ? 8 : 1.5
                            });
                            //We also add at the same time, some metadata and cached items that matches the order of the point added.
                            matchingIndexMetadata.push({
                                satName,
                                noradID,
                                sgp4Constants: sgp4Constants.val,
                                sgp4Elements: sgp4Elements.val,
                                TLEEpochTs,
                                idx: tempIdx
                            });
                            //We added, so increase counter
                            tempIdx += 1;

                            //For fun, let's draw the orbit track of the International Space Station!
                            if (noradID === '25544') {
                                //First we need a scratch time and the start time of Cesium.
                                const tempDate = new Date(startDate);
        
                                //We need to create a sample of positions. Also really important; it needs to be in inertial reference frame!
                                const sampledPositions = new CesiumJs.SampledPositionProperty(CesiumJs.ReferenceFrame.INERTIAL);
                                //Setting interpolation settings...
                                sampledPositions.setInterpolationOptions({
                                    interpolationAlgorithm: CesiumJs.LagrangePolynomialApproximation,
                                    interpolationDegree: 5
                                })
        
                                //We're targeting sample per minute; so it is difference in days; multiplied by hours in a day; then multiplied by minutes in an hour.
                                const samplesCount = CesiumJs.JulianDate.compare(cesiumClock.stopTime, cesiumClock.startTime) * 24 * 60;
                                for (let i = 0; i < samplesCount; i++) {
                                    //Add a minute. ms * s ;
                                    const tempTs = tempDate.getTime() + (1000 * 60);
                                    //Set new time; i.e., add one more minute.
                                    tempDate.setTime(tempTs);
                                    //Get Julian Date
                                    const tempJDate = CesiumJs.JulianDate.fromDate(tempDate);
                                    //Get time from TLE epoch for propagatiton
                                    const tempMinsFromEpoch = (tempTs - TLEEpochTs) / 1000 / 60;
                                    const tempPropagationPoint = sgp4Constants.val.propagate(tempMinsFromEpoch);
                                    if (tempPropagationPoint.tag === 'ok'){
                                        sampledPositions.addSample(
                                            tempJDate,
                                            new CesiumJs.Cartesian3(
                                                tempPropagationPoint.val.position[0] * 1000,
                                                tempPropagationPoint.val.position[1] * 1000,
                                                tempPropagationPoint.val.position[2] * 1000
                                            )
                                        );
                                    }
                                }
        
                                //Create a path entity to show the ISS orbit path
                                entitiesCollection.add({
                                    position: sampledPositions,
                                    orientation: new CesiumJs.VelocityOrientationProperty(sampledPositions),
                                    availability: new CesiumJs.TimeIntervalCollection([
                                        new CesiumJs.TimeInterval({ start: cesiumClock.startTime, stop: cesiumClock.stopTime })
                                    ]),
                                    path: new CesiumJs.PathGraphics({
                                        width: 1,
                                        resolution: 120,
                                        material: CesiumJs.Color.AQUAMARINE.withAlpha(0.5)
                                    })
                                });
                            }
                        }
                    }
                }
            });

            //Assign these values to refs; This is useful if you ever need to chop up functions.
            //Also it is helpful to cache certain values as you want to save much computation as possible during per-frame functins.
            pointsMetadataRef.current = matchingIndexMetadata;
            pointsCollectionRef.current = newPointsCollection;
            pointsCollectionPrimitivesRef.current = newPointsCollection._pointPrimitives as PointPrimitive[];

            const pointsCollectionPrimitivesLen = pointsCollectionPrimitivesRef.current.length;
            const timeLimit = CesiumJs.JulianDate.compare(cesiumViewer.current.clock.stopTime, cesiumViewer.current.clock.startTime);

            const animatePoints = () => {
                if (cesiumViewer.current !== null &&
                    pointsMetadataRef.current !== null &&
                    pointsCollectionRef.current !== null &&
                    pointsCollectionPrimitivesRef.current !== null) {

                    //We first gotta get times...
                    const currentJDate = cesiumViewer.current.clock.currentTime;

                    //Check if current time goes over stop time... (i.e., 3 days)
                    if (Math.abs(CesiumJs.JulianDate.compare(cesiumViewer.current.clock.currentTime, cesiumViewer.current.clock.stopTime)) > timeLimit) {
                        //Restart time... as we don't want to propagate out too far because it'll be wildly inaccurate.
                        cesiumViewer.current.clock.currentTime = cesiumViewer.current.clock.startTime.clone();
                        return;
                    }

                    //This is needed to translate the output from the SGP4 propgator to proper rotation frame at each animation frame (because it is time dependant);
                    const matrixTranslation = CesiumJs.Matrix4.fromRotationTranslation(CesiumJs.Transforms.computeTemeToPseudoFixedMatrix(currentJDate));
                    //Apply translation to PointsCollection as it will apply the translation to all points...
                    pointsCollectionRef.current.modelMatrix = matrixTranslation;
                    
                    //Loop through all of points and start updating their positions... (i.e., propagate them);
                    for (let i = 0; i < pointsCollectionPrimitivesLen; i++) {
                        //The two arrays have synchronized indexes from previous .push/.add
                        const point = pointsCollectionPrimitivesRef.current[i];
                        const metadata = pointsMetadataRef.current[i];
                        //Convert JulianDate to Unix Timestamp
                        const currentUnitxTs = (((currentJDate.dayNumber - 2440587.5) * 86400) + (currentJDate.secondsOfDay)) * 1000;
                        const minsFromEpoch = (currentUnitxTs - pointsMetadataRef.current[i].TLEEpochTs) / 60000;
                        //Now we finally generate a new cartesian positions for this satellite...
                        const newPropagationPoint = metadata.sgp4Constants.propagate(minsFromEpoch);
                        //Check if propagation went through ok...
                        if (newPropagationPoint.tag === 'ok') {
                            const pointPosition = newPropagationPoint.val.position;
                            //Assign new cartesian3 to the point. Convert from km to m
                            point.position = new CesiumJs.Cartesian3(
                                pointPosition[0] * 1000,
                                pointPosition[1] * 1000,
                                pointPosition[2] * 1000
                            )
                        }
                    }
                }
            };

            //Assign animation function to Cesium
            cesiumViewer.current.scene.preRender.addEventListener(animatePoints);
            
            setIsLoaded(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [TLEs, isLoaded, sgp4Module]);

    return (
        <div
            ref={cesiumContainerRef}
            id='cesium-container'
            style={{height: '100vh', width: '100vw'}}
        />
    )
}

export default CesiumComponent