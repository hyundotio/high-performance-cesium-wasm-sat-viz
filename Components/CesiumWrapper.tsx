'use client'

import dynamic from 'next/dynamic'
import React from 'react';
import type { CesiumType } from '../types/cesium';
import type { TLE } from '../types/TLE';

const CesiumDynamicComponent = dynamic(() => import('./CesiumComponent'), {
    ssr: false
});

export const CesiumWrapper:React.FunctionComponent<{
    TLEs: TLE[]
}> = ({
    TLEs
}) => {
    const [CesiumJs, setCesiumJs] = React.useState<CesiumType | null>(null);
    
    React.useEffect(() => {
        if (CesiumJs !== null) return
        const CesiumImportPromise = import('cesium');
        Promise.all([CesiumImportPromise]).then((promiseResults) => {
            const { ...Cesium } = promiseResults[0];
            setCesiumJs(Cesium);
        });
    }, [CesiumJs]);

    return (
        CesiumJs ? <CesiumDynamicComponent CesiumJs={CesiumJs} TLEs={TLEs} /> : null
    )
}

export default CesiumWrapper;