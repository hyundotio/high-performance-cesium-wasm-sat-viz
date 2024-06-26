import Head from "next/head";
import styles from "@/styles/Home.module.css";
import type { NextPage } from "next";
import CesiumWrapper from "../Components/CesiumWrapper"
import type { TLE } from "../types/TLE";
import React from "react";

export const Home: NextPage = () => {
  const [TLEs, setTLEs] = React.useState<TLE[]>([]);

  const getAndProcessTLEs = React.useCallback(async() => {
    //Do some fancy thing on your own to get your own up-to-date TLEs.
    //You can get TLEs from space-track.org, celestrak, or other sources.
    //For this demo, we're downloading from a static source.
    const getTLE = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/tle_04_13_2024.txt`);
    const TLEstr = await getTLE.text();

    if (typeof TLEstr === 'string' && TLEstr.length) {
      //Get string; then turn string into array
      const TLEArr = TLEstr.split('\n');
      const TLEArrLastItemIdx = TLEArr.length - 1;
      
      //This is to trim any empty string array items.
      if (TLEArr[0] === ''){
        TLEArr.splice(0, 1);
      }
      if (TLEArr[TLEArrLastItemIdx] === ''){
        TLEArr.splice(TLEArrLastItemIdx, 1);
      }
      const TLEPostProcessedArrLen = TLEArr.length;
      //Making sure the entire array is divisible by 3 (I.e., they're multiple 3LEs)
      if (TLEArr.length && TLEArr.length % 3 === 0) {
        const newTLEs: TLE[] = [];
        for (let i = 0; i < TLEPostProcessedArrLen; i+=3) {
          //A TLE (3LE) has 3 lines. Iterate every 3
          const TLEGroup = [TLEArr[i].replace('\r',''), TLEArr[i+1].replace('\r',''), TLEArr[i+2].replace('\r','')];
          newTLEs.push(TLEGroup);
        }
        setTLEs(newTLEs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  React.useEffect(() => {
    //On load, download the data client-side. It's too heavy to do on server-side.
    getAndProcessTLEs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });


  const websiteTitle = 'High-performance Satellite Visualization';
  const websiteDescription = 'A high-performance satellite visualization built with Next.js 14, TypeScript, and Cesium hosted on Vercel';
  return (
    <>
      <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
          <meta property="og:type" content="website" key="ogtype" />
          <title key="title">{websiteTitle}</title>
          <link rel="canonical" href={`https://hp-sat-viz.vercel.app`} key="canonical" />
          <meta name="twitter:title" content={websiteTitle} key="twname" />
          <meta property="og:title" content={websiteTitle} key="ogtitle" />
          <meta name="description" content={websiteDescription} key="desc" />
          <meta name="og:description" content={websiteDescription} key="ogdesc" />
          <meta name="twitter:description" content={websiteDescription} key="twdesc" />
          <meta property="og:url" content={`https://hp-sat-viz.vercel.app`} key="ogurl" />
          <meta property="og:image" content={`https://hp-sat-viz.vercel.app/og.png`} key="ogimg" />
          <meta name="twitter:image" content={`https://hp-sat-viz.vercel.app/og.png`} key="twimg" />
          <meta name="twitter:card" content="summary_large_image" key="twlrgimg" />
          <link rel="icon" href="/favicon.ico" key="favicon" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <main>
        <a
          className={styles['source-link']}
          href='https://github.com/hyundotio/high-performance-cesium-wasm-sat-viz'
          target='_blank'
          rel='noreferrer noopener'
        >
          GitHub Source link
        </a>
        <CesiumWrapper TLEs={TLEs} />
      </main>
    </>
  );
}

export default Home;