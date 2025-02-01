import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test song registration with NFT minting",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const artist = accounts.get('wallet_1')!;
        const producer = accounts.get('wallet_2')!;
        const label = accounts.get('wallet_3')!;

        // Register song
        let block = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'register-song', [
                types.uint(1),
                types.principal(artist.address),
                types.principal(producer.address),
                types.principal(label.address),
                types.uint(50),
                types.uint(30),
                types.uint(20)
            ], deployer.address)
        ]);

        block.receipts[0].result.expectOk();

        // Mint NFT
        let mintBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'mint-song-nft', [
                types.uint(1),
                types.uint(1),
                types.ascii("ipfs://Qm...")
            ], artist.address)
        ]);

        mintBlock.receipts[0].result.expectOk();

        // Check NFT details
        let checkBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'get-nft-details', [
                types.uint(1)
            ], deployer.address)
        ]);

        checkBlock.receipts[0].result.expectOk();
    }
});

Clarinet.test({
    name: "Test NFT transfer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const artist = accounts.get('wallet_1')!;
        const newOwner = accounts.get('wallet_4')!;

        // Setup song and NFT
        let setupBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'register-song', [
                types.uint(1),
                types.principal(artist.address),
                types.principal(accounts.get('wallet_2')!.address),
                types.principal(accounts.get('wallet_3')!.address),
                types.uint(50),
                types.uint(30),
                types.uint(20)
            ], deployer.address),
            Tx.contractCall('royalty-distributor', 'mint-song-nft', [
                types.uint(1),
                types.uint(1),
                types.ascii("ipfs://Qm...")
            ], artist.address)
        ]);

        // Transfer NFT
        let transferBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'transfer-nft', [
                types.uint(1),
                types.principal(newOwner.address)
            ], artist.address)
        ]);

        transferBlock.receipts[0].result.expectOk();
    }
});
