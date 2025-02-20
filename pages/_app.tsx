import "../styles/globals.css";

import {
  ConnectionProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import React, { useEffect, useState } from "react";
import DotsHorizontalIcon from "@heroicons/react/solid/DotsHorizontalIcon";
import SwitchHorizontalIcon from "@heroicons/react/solid/SwitchHorizontalIcon";
import PhotographIcon from "@heroicons/react/solid/PhotographIcon";
import TerminalIcon from "@heroicons/react/solid/TerminalIcon";
import { ModalProvider } from "../contexts/ModalProvider";
import SideMenu from "../components/side-menu";
import TopMenu from "../components/top-menu";
import { MenuLink } from "../components/menu-link";
import { ImageURI } from "../util/image-uri";
import { FileProvider } from "../contexts/FileProvider";
import { MadeWithLove } from "../components/made-with-love";
import { CopyToClipboard } from "../components/copy-to-clipboard";
import { PerformanceProvider } from "../contexts/PerformanceProvider";
import {
  BankIcon,
  CameraIcon,
  CoinsIcon,
  FingerPrintIcon,
  FireIcon,
  GetCashIcon,
  HammerIcon,
  InfoIcon,
  SendIcon,
} from "../components/icons";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { JupiterProvider } from "@jup-ag/react-hook";
import { getPlatformFeeAccounts } from "@jup-ag/core";
import { PublicKey } from "@solana/web3.js";
import CloudUploadIcon from "@heroicons/react/solid/CloudUploadIcon";
import { BalanceProvider } from "../contexts/BalanceProvider";
import SideMenuLarge from "../components/side-menu-lg";

const endpoint = process.env.NEXT_PUBLIC_RPC;

const WalletProvider = dynamic(
  () => import("../contexts/ClientWalletProvider"),
  {
    ssr: false,
  }
);

const Providers = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [platformFeeAndAccounts, setPlatformFeeAndAccounts] =
    useState(undefined);
  useEffect(() => {
    (async () => {
      if (process.env.NEXT_PUBLIC_JUPITER_FEE_DESTINATION) {
        const feeAccs = await getPlatformFeeAccounts(
          connection,
          new PublicKey(process.env.NEXT_PUBLIC_JUPITER_FEE_DESTINATION)
        );
        setPlatformFeeAndAccounts({
          feeBps: +(process.env.NEXT_PUBLIC_JUPITER_FEE_AMOUNT || 0),
          feeAccounts: feeAccs,
        });
      }
    })();
  }, [connection]);
  return (
    <FileProvider>
      {/* @ts-ignore */}

      <ToastContainer theme="dark" />
      <ModalProvider>
        <JupiterProvider
          connection={connection}
          cluster="mainnet-beta"
          userPublicKey={publicKey}
          platformFeeAndAccounts={platformFeeAndAccounts}
        >
          {children}
        </JupiterProvider>
      </ModalProvider>
    </FileProvider>
  );
};

function Context({ children }: { children: React.ReactNode }) {
  if (endpoint === undefined) {
    throw new Error("Missing NEXT_PUBLIC_RPC in env file");
  }

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        confirmTransactionInitialTimeout: 120000,
        commitment: "finalized",
      }}
    >
      <WalletProvider>
        <BalanceProvider>
          <>
            <Head>
              <title>🛠️ Cryptostraps Tools</title>
            </Head>
            <div className="drawer drawer-end">
              <input id="my-drawer" type="checkbox" className="drawer-toggle" />
              <div className="relative h-screen drawer-content lg:ml-64">
                <div className="hidden absolute right-0 top-4 z-50 p-4 lg:inline-block">
                  <WalletMultiButton className="w-full" />
                </div>
                <div className="lg:hidden">
                  <TopMenu />
                </div>
                <SideMenuLarge />

                <main
                  className={`relative col-span-2 mt-28 mb-12 lg:col-span-1`}
                  style={{ maxWidth: "100%" }}
                >
                  <div
                    className="px-6 mx-auto max-w-full"
                    style={{ width: 1200 }}
                  >
                    {children}
                  </div>
                </main>
                <div className="hidden fixed right-6 bottom-6 text-center xl:block">
                  RPC powered by
                  <a
                    href="https://twitter.com/GenesysGo"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="mx-auto w-16"
                      src={ImageURI.GenesysGo}
                      alt="Genesysgo"
                    />
                  </a>
                </div>
              </div>

              <SideMenu />
            </div>
          </>
        </BalanceProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Context>
      <Providers>
        <PerformanceProvider>
          {/* @ts-ignore */}
          <Component {...pageProps} />

          <hr className="mt-8 opacity-10" />

          <div className="mt-auto w-full">
            <div
              className={`flex flex-row gap-4 justify-center items-center mt-6 text-center`}
            >
              <MadeWithLove />
            </div>
          </div>
        </PerformanceProvider>
      </Providers>
    </Context>
  );
}
export default MyApp;
