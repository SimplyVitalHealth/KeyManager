import {Injectable, OnInit} from '@angular/core';

// import * as Web3 from 'web3';
// import Web3 from 'web3';
// const Web3 = require('web3');
// const web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");

declare let require: any;
declare let window: any;

let tokenAbi = require('./HealthDRS.json');

@Injectable()
export class Web3Service {
  private _account: string = null;
  private _web3: any;

  private _tokenContract: any;
  private _tokenContractAddress: string = "0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB";

  constructor() {
    if (typeof window.web3 !== 'undefined') {
      // Use Mist/MetaMask's provider
      this._web3 = new Web3(window.web3.currentProvider);
      if (this._web3.version.network !== '4') {
        alert('Please connect to the Rinkeby network');
      }
    } else {
      console.warn(
        'Please use a dapp browser like mist or MetaMask plugin for chrome'
      );
    }

    this._tokenContract = this._web3.eth.contract(tokenAbi).at(this._tokenContractAddress);
  }

  test(): any {

      };


  private async getAccount(): Promise<string> {
    if (this._account == null) {
      this._account = await new Promise((resolve, reject) => {
        this._web3.eth.getAccounts((err, accs) => {
          if (err != null) {
            alert('There was an error fetching your accounts.');
            return;
          }

          if (accs.length === 0) {
            alert(
              'Couldn\'t get any accounts! Make sure your Ethereum client is configured correctly.'
            );
            return;
          }
          resolve(accs[0]);
        })
      }) as string;

      this._web3.eth.defaultAccount = this._account;
    }

    return Promise.resolve(this._account);
  }

  public async getUserBalance(): Promise<number> {
    let account = await this.getAccount();

    return new Promise((resolve, reject) => {
      let _web3 = this._web3;
      this._tokenContract.balanceOf.call(account, function (err, result) {
        if(err != null) {
          reject(err);
        }

        resolve(_web3.fromWei(result));
      });
    }) as Promise<number>;
  }
}
