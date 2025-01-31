import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test song registration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const artist = accounts.get('wallet_1')!;
        const producer = accounts.get('wallet_2')!;
        const label = accounts.get('wallet_3')!;

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
    }
});

Clarinet.test({
    name: "Test royalty distribution",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const artist = accounts.get('wallet_1')!;
        const producer = accounts.get('wallet_2')!;
        const label = accounts.get('wallet_3')!;

        // First register a song
        let registerBlock = chain.mineBlock([
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

        // Then distribute royalties
        let distributeBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'distribute-royalty', [
                types.uint(1),
                types.uint(1000)
            ], deployer.address)
        ]);

        distributeBlock.receipts[0].result.expectOk();

        // Check payments
        let checkBlock = chain.mineBlock([
            Tx.contractCall('royalty-distributor', 'get-royalty-payment', [
                types.uint(1),
                types.principal(artist.address)
            ], deployer.address)
        ]);

        checkBlock.receipts[0].result.expectOk();
    }
});
