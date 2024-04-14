import Head from "next/head";
import styles from "@/styles/Home.module.css";
import type { GetServerSideProps, InferGetServerSidePropsType, NextPage } from "next";
import CesiumWrapper from "../Components/CesiumWrapper"
import type { Position } from "../types/position";

type Props = {
  position: Position
}

export const Home: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ position }) => {
  const websiteTitle = 'Cesium in Next.js 14 (Page router) with TypeScript';
  const websiteDescription = 'An example Next.js 14 TypeScript project displaying Cesium hosted in Vercel';
  return (
    <>
      <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
          <meta property="og:type" content="website" key="ogtype" />
          <title key="title">{websiteTitle}</title>
          <link rel="canonical" href={`https://nextjs-pr-cesium.vercel.app`} key="canonical" />
          <meta name="twitter:title" content={websiteTitle} key="twname" />
          <meta property="og:title" content={websiteTitle} key="ogtitle" />
          <meta name="description" content={websiteDescription} key="desc" />
          <meta name="og:description" content={websiteDescription} key="ogdesc" />
          <meta name="twitter:description" content={websiteDescription} key="twdesc" />
          <meta property="og:url" content={`https://nextjs-pr-cesium.vercel.app`} key="ogurl" />
          <meta property="og:image" content={`https://nextjs-pr-.vercel.app/og.png`} key="ogimg" />
          <meta name="twitter:image" content={`https://nextjs-pr-cesium.vercel.app/og.png`} key="twimg" />
          <meta name="twitter:card" content="summary_large_image" key="twlrgimg" />
          <link rel="icon" href="/favicon.ico" key="favicon" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <main>
        <a
          className={styles['source-link']}
          href='https://github.com/hyundotio/next-ts-pageroutter-cesium-example'
          target='_blank'
          rel='noreferrer noopener'
        >
          GitHub Source link
        </a>
        <CesiumWrapper positions={[position]} />
      </main>
    </>
  );
}

export const getServerSideProps:GetServerSideProps<Props> = async () => {
  //Mock server data transfer
  return {
    props: {
      position: {
        lat: 39.953436,
        lng: -75.164356
      }
    }
  };
}

export default Home;