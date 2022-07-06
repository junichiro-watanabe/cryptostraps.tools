import type { MetaplexPlugin } from "../../types";
import { TokenClient } from './TokenClient';
export declare const tokenModule: () => MetaplexPlugin;
declare module '../../Metaplex' {
    interface Metaplex {
        tokens(): TokenClient;
    }
}
