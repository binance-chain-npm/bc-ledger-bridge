import { ledger as Ledger, crypto } from '@binance-chain/javascript-sdk';
import LedgerApp, {
  Version,
} from '@binance-chain/javascript-sdk/lib/ledger/ledger-app';

import {
  DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
  DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
  DEFAULT_LEDGER_TRANSPORT,
  DEFAULT_LEDGER_OPEN_TIMEOUT,
  LEDGER_EXPECTED_MAJOR_VERSION,
  DEFAULT_GET_ADDRESSES_LIMIT,
} from './constants';
import { TransportKeys, Props } from './types';

export class LedgerClient {
  private _transportKey: TransportKeys;
  private _interactiveTimeout: number;
  private _nonInteractiveTimeout: number;
  private _app: LedgerApp | null;
  private _version: Version;

  constructor({
    transportKey = DEFAULT_LEDGER_TRANSPORT,
    interactiveTimeout = DEFAULT_LEDGER_INTERACTIVE_TIMEOUT,
    nonInteractiveTimeout = DEFAULT_LEDGER_NONINTERACTIVE_TIMEOUT,
  }: Props) {
    this._transportKey = transportKey;
    this._interactiveTimeout = interactiveTimeout;
    this._nonInteractiveTimeout = nonInteractiveTimeout;
    this._app = null;
    this._version = {} as Version;
  }

  async init(
    callback: Function,
    openTimeout: number = DEFAULT_LEDGER_OPEN_TIMEOUT
  ) {
    if (!this._app) {
      let transImpl = Ledger.transports[this._transportKey];
      if (this._transportKey === 'node' && !transImpl) {
        transImpl = require('@ledgerhq/hw-transport-node-hid').default;
      }

      const transInst = await transImpl.create(openTimeout);
      // eslint-disable-next-line
      const app = new Ledger.app(
        transInst,
        this._interactiveTimeout,
        this._nonInteractiveTimeout
      );
      const version = (this._version = await app.getVersion());
      if (version.device_locked) {
        throw new Error('Ledger Device is locked, please unlock it first');
      }

      if (version.major !== LEDGER_EXPECTED_MAJOR_VERSION) {
        throw new Error(
          `Ledger: Expected app major version ${LEDGER_EXPECTED_MAJOR_VERSION}, but got ${version.major}`
        );
      }

      this._app = app;
      this._version = version;
    }
    callback && callback.call(this, this._app);
  }

  mustHaveApp() {
    if (this._app === null) {
      throw new Error('LedgerClient: Call init() first');
    }
    return this._app;
  }

  getApp() {
    return this._app;
  }

  async getVersion() {
    console.debug('LedgerClient: getVersion()');
    this.mustHaveApp();
    if (this._version) {
      return Promise.resolve(this._version);
    }
    return this._app?.getVersion();
  }

  async getPublicKey(hdPath: number[]) {
    console.debug('LedgerClient: getPublicKey()');
    return this.mustHaveApp().getPublicKey(hdPath);
  }

  async getAddress(hdPath: number[]) {
    console.debug('LedgerClient: getAddress()');
    const response = await this.getPublicKey(hdPath);
    const { pk } = response;
    const address = crypto.getAddressFromPublicKey(
      (pk as Buffer).toString('hex')
    );
    return address;
  }

  async getAddresses({
    hdPathStart,
    hrp = 'bnb',
    limit = DEFAULT_GET_ADDRESSES_LIMIT,
  }: {
    hdPathStart: Array<number>;
    hrp?: string;
    limit?: number;
  }) {
    console.debug('LedgerClient: getAddresses()');
    if (!Array.isArray(hdPathStart) || hdPathStart.length < 5) {
      throw new Error(
        'hdPathStart must be an array containing at least 5 path nodes'
      );
    }
    const addresses = [];
    let hdPath = hdPathStart;
    for (let i = 0; i < limit; i++) {
      if (Number(hdPath[hdPath.length - 1]) > 0x7fffffff) break;

      const response = await this.getPublicKey(hdPath);
      const { pk } = response;
      const address = crypto.getAddressFromPublicKey(
        (pk as Buffer).toString('hex'),
        hrp
      );
      addresses.push(address);

      hdPath = hdPathStart.slice();
      hdPath[hdPath.length - 1] = i + hdPath[hdPath.length - 1] + 1;
    }
    return addresses;
  }

  async showAddress(hrp = 'bnb', hdPath: number[] = [44, 714, 0, 0, 0]) {
    if (
      this._version &&
      this._version.major === 1 &&
      this._version.minor === 0
    ) {
      throw new Error('Ledger: showAddress is not supported in app v1.0.x!');
    }
    return this.mustHaveApp().showAddress(hrp, hdPath);
  }

  async sign(signBytes: Buffer, hdPath: number[]) {
    return this.mustHaveApp().sign(signBytes, hdPath);
  }
}
