import {
  AccountInfo,
  Connection,
  InflationReward,
  ParsedAccountData,
  PublicKey,
  StakeProgram,
} from "@solana/web3.js";
import { coerce, create, instance, string } from "superstruct";
import BN from "bignumber.js";
import { Infer, number, nullable, enums, type } from "superstruct";
import { toPublicKey } from "./to-publickey";
/* eslint-disable @typescript-eslint/no-redeclare */

export const PublicKeyFromString = coerce(
  instance(PublicKey),
  string(),
  (value) => toPublicKey(value)
);
export const BigNumFromString = coerce(instance(BN), string(), (value) => {
  if (typeof value === "string") return new BN(value, 10);
  throw new Error("invalid big num");
});
export type StakeAccountType = Infer<typeof StakeAccountType>;
export const StakeAccountType = enums([
  "uninitialized",
  "initialized",
  "delegated",
  "rewardsPool",
]);

export type StakeMeta = Infer<typeof StakeMeta>;
export const StakeMeta = type({
  rentExemptReserve: BigNumFromString,
  authorized: type({
    staker: PublicKeyFromString,
    withdrawer: PublicKeyFromString,
  }),
  lockup: type({
    unixTimestamp: number(),
    epoch: number(),
    custodian: PublicKeyFromString,
  }),
});

export type StakeAccountInfo = Infer<typeof StakeAccountInfo>;
export const StakeAccountInfo = type({
  meta: StakeMeta,
  stake: nullable(
    type({
      delegation: type({
        voter: PublicKeyFromString,
        stake: BigNumFromString,
        activationEpoch: BigNumFromString,
        deactivationEpoch: BigNumFromString,
        warmupCooldownRate: number(),
      }),
      creditsObserved: number(),
    })
  ),
});

export type StakeAccount = Infer<typeof StakeAccount>;
export const StakeAccount = type({
  type: StakeAccountType,
  info: StakeAccountInfo,
});
export const STAKE_PROGRAM_ID = new PublicKey(
  "Stake11111111111111111111111111111111111111"
);

export interface StakeAccountMeta {
  address: PublicKey;
  seed: string;
  lamports: number;
  stakeAccount: StakeAccount;
  inflationRewards: InflationReward[];
}

async function promiseAllInBatches<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number
) {
  let results: T[] = [];
  while (tasks.length > 0) {
    const currentTasks = tasks.splice(0, batchSize);
    results = results.concat(
      await Promise.all(currentTasks.map((task) => task()))
    );
    console.log("batch finished");
  }
  return results;
}

export function accountInfoToStakeAccount(
  account: AccountInfo<Buffer | ParsedAccountData>
): StakeAccount | undefined {
  return (
    ("parsed" in account?.data && create(account.data.parsed, StakeAccount)) ||
    undefined
  );
}

export function sortStakeAccountMetas(stakeAccountMetas: StakeAccountMeta[]) {
  stakeAccountMetas.sort((a, b) => {
    if (a.seed < b.seed) {
      return -1;
    } else if (a.seed > b.seed) {
      return 1;
    }
    return 0;
  });
}

export async function findStakeAccountMetas(
  connection: Connection,
  walletAddress: PublicKey
): Promise<StakeAccountMeta[]> {
  let newStakeAccountMetas: StakeAccountMeta[] = [];

  // Create potential solflare seed PDAs
  const solflareStakeAccountSeedPubkeys = await Promise.all(
    Array.from(Array(20).keys()).map(async (i) => {
      const seed = `stake:${i}`;
      return PublicKey.createWithSeed(
        walletAddress,
        seed,
        STAKE_PROGRAM_ID
      ).then((pubkey) => ({ seed, pubkey }));
    })
  );

  const naturalStakeAccountSeedPubkeys = await Promise.all(
    Array.from(Array(20).keys()).map(async (i) => {
      const seed = `${i}`;
      return PublicKey.createWithSeed(
        walletAddress,
        seed,
        STAKE_PROGRAM_ID
      ).then((pubkey) => ({ seed, pubkey }));
    })
  );

  const parsedStakeAccounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        { dataSize: 200 }, // TODO: Trent said we might want to exclude the dataSize filter
        {
          memcmp: {
            offset: 12,
            bytes: walletAddress.toBase58(),
          },
        },
      ],
    }
  );

  parsedStakeAccounts.forEach(({ pubkey, account }) => {
    console.log(
      "parsed" in account?.data
        ? account?.data.parsed
        : "Does not contain parsed data"
    );
    const stakeAccount = accountInfoToStakeAccount(account);
    if (!stakeAccount) {
      return;
    }

    // We identify accounts with the solflare seed, or natural seed only for now
    const matchingSolflareSeed = solflareStakeAccountSeedPubkeys.find(
      (element) => element.pubkey.equals(pubkey)
    )?.seed;
    const matchingNaturalSeed = naturalStakeAccountSeedPubkeys.find((element) =>
      element.pubkey.equals(pubkey)
    )?.seed;
    const seed =
      matchingSolflareSeed ||
      matchingNaturalSeed ||
      `${pubkey.toBase58().slice(12)}...`;

    const balanceLamports = account.lamports;
    newStakeAccountMetas.push({
      address: pubkey,
      seed,
      lamports: balanceLamports,
      stakeAccount,
      inflationRewards: [],
    });
  });

  const epochInfo = await connection.getEpochInfo();

  const delegatedActivationEpochs = newStakeAccountMetas
    .filter((meta) => meta.stakeAccount.info.stake?.delegation.activationEpoch)
    .map(
      (meta) =>
        meta.stakeAccount.info.stake?.delegation.activationEpoch?.toNumber() ??
        1000
    ); // null coallescing not possible here

  if (delegatedActivationEpochs.length !== 0) {
    const minEpoch = Math.min(...delegatedActivationEpochs);

    console.log(`minEpoch: ${minEpoch}`);

    let startEpoch = epochInfo.epoch - 1; // No rewards yet for the current epoch, so query from previous epoch
    const tasks: (() => Promise<(InflationReward | null)[]>)[] = [];
    for (let epoch = startEpoch; epoch > minEpoch; epoch--) {
      // tasks.push(() =>
      //   connection.getInflationReward(
      //     newStakeAccountMetas.map((accountMeta) => accountMeta.address),
      //     epoch,
      //     "finalized"
      //   )
      // );
    }

    sortStakeAccountMetas(newStakeAccountMetas);

    const inflationRewardsResults = await promiseAllInBatches(tasks, 4);
    inflationRewardsResults.forEach((inflationRewards) =>
      inflationRewards.forEach((inflationReward, index) => {
        if (inflationReward) {
          newStakeAccountMetas[index].inflationRewards.push(inflationReward);
        }
      })
    );
  }

  return newStakeAccountMetas;
}
