import LedgerApp from '@binance-chain/javascript-sdk/lib/ledger/ledger-app';
export declare class BcLedgerBridge {
    private app;
    private transport;
    constructor();
    addEventListeners(): void;
    sendMessageToExtension(msg: any): void;
    makeApp(): Promise<void>;
    cleanUp(): void;
    unlock(replyAction: any, hdPath: any): Promise<void>;
    signTransaction(replyAction: string, hdPath: any, tx: any): Promise<void>;
    mustHaveApp(): LedgerApp;
    getPublicKey(hdPath: number[]): Promise<import("@binance-chain/javascript-sdk/lib/ledger/ledger-app").PublicKey>;
    getAddresses({ hdPathStart, hrp, limit, }: {
        hdPathStart: Array<number>;
        hrp?: string;
        limit?: number;
    }): Promise<string[]>;
    ledgerErrToMessage(err: any): any;
}