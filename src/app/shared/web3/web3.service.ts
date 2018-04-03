import { Injectable, EventEmitter, Output } from '@angular/core';
// const Web3 = require('web3');
import { Http, Response,Headers, RequestOptions,URLSearchParams } from '@angular/http';
import * as async from 'async';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import 'rxjs/add/operator/map';

@Injectable()
export class Web3Service {

  @Output() update = new EventEmitter();
   private mainContractAddr: string = '' //Main net
   private contractAddr: string = '0x1ba6cea196f186e6ee2d8ac46308e6d18018e910'// Rinkeby Default
   private defaultNodeIP: string = 'MetaMask';                    // Default node
   private nodeIP: string;                                                      // Current nodeIP
   private nodeConnected: boolean = true;                                       // If we've established a connection yet
   private adding: boolean = false;                                             // If we're adding a question
   private web3Instance: any;                                                   // Current instance of web3
   private unlockedAccount: string;
   private addr: string;
   private privateKey: string;
   private address: string;
   private abi:any = [ {} ]; // redacted on purpose
   private abiArray:any = this.abi;
   private contract: any;
   private _contract: any;
   private services: Array<{}>;
   private keys: Array<{}>;
   private keysData: Array<{}>;
   private keyOwners:any;
   private keyNumber:number;
   private keyAccess:any;

   private selectedParentKey = new Subject<string>();
   private selectedChildKey = new Subject<string>();
   private authorized = new BehaviorSubject<boolean>(false);
   private loaded = new BehaviorSubject<boolean>(false);

   parentKeyChanged$ = this.selectedParentKey.asObservable();
   childKeyChanged$ = this.selectedChildKey.asObservable();
   loginChanged$ = this.authorized.asObservable();
   onLoad$ = this.loaded.asObservable();

         // Current unlocked account
   // Application Binary Interface so we can use the question contract
   //private ABI  = [{'constant':false,'inputs':[{'name':'queryID','type':'bytes32'},{'name':'result','type':'string'}],'name':'__callback','outputs':[],'type':'function'},{'constant':true,'inputs':[{'name':'','type':'uint256'}],'name':'questions','outputs':[{'name':'contractAddress','type':'address'},{'name':'site','type':'string'},{'name':'questionID','type':'uint256'},{'name':'winnerAddress','type':'address'},{'name':'winnerID','type':'uint256'},{'name':'acceptedAnswerID','type':'uint256'},{'name':'updateDelay','type':'uint256'},{'name':'expiryDate','type':'uint256'},{'name':'ownedFee','type':'uint256'}],'type':'function'},{'constant':false,'inputs':[],'name':'kill','outputs':[],'type':'function'},{'constant':true,'inputs':[{'name':'_i','type':'uint256'},{'name':'_sponsorAddr','type':'address'}],'name':'getSponsorBalance','outputs':[{'name':'sponsorBalance','type':'uint256'}],'type':'function'},{'constant':false,'inputs':[{'name':'_questionID','type':'uint256'},{'name':'_site','type':'string'}],'name':'handleQuestion','outputs':[],'type':'function'},{'constant':false,'inputs':[{'name':'_i','type':'uint256'}],'name':'increaseBounty','outputs':[],'type':'function'},{'constant':true,'inputs':[],'name':'contractBalance','outputs':[{'name':'','type':'uint256'}],'type':'function'},{'constant':true,'inputs':[{'name':'_questionID','type':'uint256'},{'name':'_site','type':'string'}],'name':'getAddressOfQuestion','outputs':[{'name':'questionAddr','type':'address'}],'type':'function'},{'constant':true,'inputs':[{'name':'_i','type':'uint256'}],'name':'getSponsors','outputs':[{'name':'sponsorList','type':'address[]'}],'type':'function'},{'inputs':[],'type':'constructor'},{'anonymous':false,'inputs':[{'indexed':false,'name':'questionAddr','type':'address'}],'name':'QuestionAdded','type':'event'},{'anonymous':false,'inputs':[],'name':'BountyIncreased','type':'event'},{'anonymous':false,'inputs':[],'name':'BountyPaid','type':'event'}];


       constructor(private http: Http) {
         this.services=[];
         this.keys=[];
         this.keysData=[];
         this.keyOwners={};
         this.keyAccess={};

         this.ngOnInit();
       }

       ngOnInit() {
         var self = this;
         console.log('http1', this.http)
         console.log('async', async)

         this.contract = this.http.get("./data/HealthDRS.json")
            .map(response => response.json() )
            .subscribe(result => {
              this.contract=result;
              this._contract=this.web3.eth.contract(this.contract.abi)

              if (this.web3.version.network == 1 ) {
                //User Main net contract Address
                this.contractAddr = this.mainContractAddr;
              }

               async.parallel([
                 function loadServices(next) {
                   let serviceEvent = self.web3.eth.contract(self.contract.abi).at(self.contractAddr).ServiceCreated({}, {fromBlock: 1649845, toBlock: 'latest'},(err, event) => {
                     // console.log(err, event)
                   })
                   serviceEvent.get((error, results) => {
                     // we have the results, now print them
                     console.log('services',results);
                     results.forEach(function(result) {

                       // if(result.args._owner==self.unlockedAccount) *JADE uncomment
                       self.services.push(result.args);
                     }, self);
                     next();
                   })
                 },
                 function loadKeys(next) {
                   let keyEvent = self.web3.eth.contract(self.contract.abi).at(self.contractAddr).KeyCreated({}, {fromBlock: 0, toBlock: 'latest'},(err, event) => {
                     //console.log(err, event)
                   })
                   keyEvent.get((error, results) => {
                     // we have the results, now print them
                     async.each(results, function(result, nextResult) {
                     let args = result && result.args || {};
                      async.series([
                        function getOwners(done) {
                          self.getKeyOwners(args._key,0,[]).then(function(result) {
                            self.keyOwners[args._key]=result;
                            done();
                          });
                        },
                        function getInfo(done) {
                          // if(args._owner==self.unlockedAccount){ *JADE uncomment
                          self.getKeyInfo(args._key).then(function(info) {
                          self.keys.push({
                            key:args._key,
                            owner:args._owner,
                            share:info[1],
                            trade:info[2],
                            sell:info[3],
                            service:info[4]
                          });
                          self.keysData.push(info);
                          done();
                        });
                        // } *JADE uncomment
                        // else{
                        //   //getUrlFromKey
                        //      self.isKeyOwner(log.args._key,self.unlockedAccount).then(function(resultOwner) {
                        //       if(resultOwner){
                        //         self.keyAccess[log.args._key]={'key':log.args._key};
                        //         self.getUrlFromKey(log.args._key).then(function(resultUrl) {
                        //           self.keyAccess[log.args._key]['url']=resultUrl;
                        //           console.log('key urls: ',self.keyAccess)
                        //           }.bind(self));
                        //         self.getKeyInfo(log.args._key).then(function(keyResult) {
                        //           self.keyAccess[log.args._key]['share']=keyResult[1];
                        //           self.keyAccess[log.args._key]['trade']=keyResult[2];
                        //           self.keyAccess[log.args._key]['sell']=keyResult[3];
                        //           self.keyAccess[log.args._key]['service']=keyResult[4];
                        //           }.bind(self));
                        //         }
                        //       }.bind(self));
                        // }
                        }
                      ], nextResult);
                    }, next);
                   })
                 },
                 function loadServiceList(next) {
                   self._contract=self.web3.eth.contract(self.contract.abi)//.at('0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB').authorizedToSpend((error, result) => {

                   self._contract.at(self.contractAddr).serviceList(3,(error, eventResult) => {
                     next();
                      if (error)
                        console.log('3Error in myEvent event handler: ' + error);
                      else
                        console.log('3myEvent: ' + eventResult);
                    })
                 }
               ], function(err) {
                 self.loaded.next(true);
               })



        new Promise<any>((resolve, reject) => {
          console.log("drs contract: ", self._contract)
          this._contract.at(this.contractAddr).getKeyCount((error, result) => {
            if (!error) {
              console.log('result contract key count:', result)
              this.keyNumber=result.c[0];
              // resolve(result);
            } else {
              console.log('error from key count:',error)
              // reject(error)
            }
            });

          });
      });
    }

    changeParentKey(parentKey: string) {
      this.selectedParentKey.next(parentKey);
    }

    changeChildKey(childKey: string) {
      this.selectedChildKey.next(childKey);
    }

    dataRequestTest(urlKey,parameter,key): any{
    //def data(request, address_id, signature_id, message_hash, parameter, key):

      var signer = this.unlockedAccount || this.web3.eth.defaultAccount || this.web3.eth.accounts[0] ;
      var original_message = "DRS Message";
      var message_hash = this.web3.sha3(
        '\u0019Ethereum Signed Message:\n' +
        original_message.length.toString() +
        original_message
      );
      // message_hash=this.web3.eth.accounts.hashMessage(original_message)
      var signature;
      console.log('web sign:',this.web3)
//     this.web3.personal.sign(message_hash,signer function(err, res) {
      let p = new Promise<any>((resolve, reject) => {this.web3.eth.sign(signer,message_hash, function(err, res) {
        if (err) console.error(err);
        signature = res;
        console.log({
          "signer": signer,
          "message": message_hash,
          "message_hash": message_hash,
          "signature": signature,
        })
        var headers = new Headers({ 'Content-Type': 'application/json'  });
        var options = new RequestOptions({ headers: headers });
        //    path('<str:address_id>/<str:signature_id>/<str:message_hash>/<str:parameter>', views.data, name='data'),
        //'http://localhost:8000/gatekeeper/'
        var url='http://'+urlKey+this.unlockedAccount+'/'+signature+'/'+message_hash+'/'+parameter+'/'+key;
        console.log(urlKey);
        console.log(url);
        return this.http.get(url, options)//,  {search: params})
                  // .map((res: Response): any =>
                  // res.json() )
                  .subscribe(result =>{
                    console.log(result, result.headers.get("Content-Type"));
                    if(result.headers.get("Content-Type") !='image/jpeg' && result.headers.get("Content-Type") !='audio/mpeg')
                    {
                      resolve(result.json())
                    }
                    if(result.headers.get("Content-Type") =='audio/mpeg')
                    {
                      const blob = new Blob([result], { type: 'audio/mpeg' });
                      const url= window.URL.createObjectURL(blob);
                      console.log('auido url',url, blob)
                      window.open(url);
                     }

                      resolve(result)

                  })

      }.bind(this)) });
      return p;

  }


   initializeWeb3(): void {
       this.nodeIP = 'MetaMask';//localStorage['nodeIP'] || this.defaultNodeIP;
      // this.web3 = new Web3(this.web3.currentProvider);
       this.connectToNode(); // Connect to whatever's available
   }

   getServices(): any {
     console.log(this._contract);

     return this.services;
   }


   getKeys(): any {
     return this.keys;
   }

   returnKeyOwners(): any {
     return this.keyOwners;
   }


   getKeysData(): any {
     return this.keysData;
   }


   getkeyAccess(): any {
     return this.keyAccess;
   }


   test(): any {
    // let p = new Promise<any>((resolve, reject) => {
       this._contract=this.web3.eth.contract(this.contract.abi)//.at('0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB').authorizedToSpend((error, result) => {
         let p = new Promise<any>((resolve, reject) => {
           this._contract.at(this.contractAddr).authorizedToSpend((error, result) => {
             if (!error) {
               console.log('result contract test1:', result)
               resolve(result);
             } else {
               console.log('error from test1:',error)
               reject(error)   }
             });

           });
           return p;
   }


   createservice(url): any {
    // let p = new Promise<any>((resolve, reject) => {
       this._contract=this.web3.eth.contract(this.contract.abi)//.at('0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB').authorizedToSpend((error, result) => {
         let p = new Promise<any>((resolve, reject) => {
           this._contract.at(this.contractAddr).createService(url,(error, result) => {
             if (!error) {

               let result2=this.web3.toAscii(result)
              //  this.web3.eth.contract(this.contract.abi).at(this.contractAddr).ServiceCreated({}, { fromBlock: 0, toBlock: 'latest' }).get((error, eventResult) => {
              //    if (error)
              //      console.log('2Error in myEvent event handler: ' + error);
              //    else
              //      console.log('2myEvent: ' + JSON.stringify(eventResult.args));
              //  });
              resolve(result2);

             } else {
               console.log('error from test2:',error)
               reject(error)   }
             });

           });
           return p;
   }


   getServiceCount(): any {
    // let p = new Promise<any>((resolve, reject) => {
       this._contract=this.web3.eth.contract(this.contract.abi)//.at('0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB').authorizedToSpend((error, result) => {
         let p = new Promise<any>((resolve, reject) => {
           this._contract.at(this.contractAddr).getServiceCount((error, result) => {
             if (!error) {
               resolve(result);
             } else {
               console.log('error from test3:',error)
               reject(error) ;  }
             });

           });
           return p;
   }


   getKeyOwners(key,index,finalResult): any {
    // let p = new Promise<any>((resolve, reject) => {
    // console.log('getKeyOwners test: ',key,' ; ',index, ': ',finalResult)
       this._contract=this.web3.eth.contract(this.contract.abi)//.at('0xbfBBd01Ae2eA4BFc777F6ea3A2Ad4843c7a104FB').authorizedToSpend((error, result) => {
         let p = new Promise<any>((resolve, reject) => {
           this._contract.at(this.contractAddr).owners(key,index,(error, result) => {
             if (!error) {
               if(result!='0x'){
                console.log('push',result)
                finalResult.push(result)
                resolve(this.getKeyOwners(key,index+1,finalResult));
               }
               else{
                resolve(finalResult);
              }
             } else {
               console.log('error from test3:',error)
               reject(error) ;  }
             });

           });
           return p;
   }


   getServiceIds(index): any {
     let p = new Promise<any>((resolve, reject) => {
        this._contract.at(this.contractAddr).serviceList(index,(error, result) => {
          if (!error) {
            resolve(result);
          } else {
            console.log(error)
            reject(error)
          }
          });
        })
          return p;


   }


   isKeyOwner(key, account): any {
     let p = new Promise<any>((resolve, reject) => {
        this._contract.at(this.contractAddr).isKeyOwner(key,account,(error, result) => {
          if (!error) {
            resolve(result);
          } else {
            console.log(error)
            reject(error)
          }
          });
        })
          return p;


   }


   getServiceURL(id): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).getUrl(id,(error, result) => {
         if (!error) {
           resolve(result);
         } else {
           console.log('error from test4:',error)
           reject(error)
         }
       });
     })
    return p;

   }


   isServiceOwner(id): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).isServiceOwner(id,this.unlockedAccount,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   shareService(id,account): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).shareService(id,account,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   unshareService(id,account): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).unshareService(id,account,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   updateURL(id,url): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).updateUrl(id,url,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   createKey(id): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).createKey(id,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }

   issueKey(id,address): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).issueKey(id,address,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   permissionKey(id,canShare,canTrade,canSell): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).setKeyPermissions(id,canShare,canTrade,canSell,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   shareKey(key,account): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).shareKey(key,account,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   unshareKey(key,account): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).unshareKey(key,account,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   createSalesOffer(key,buyer,price,canSell): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).createSalesOffer(key,buyer,price,canSell,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   cancelSalesOffer(key): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).cancelSalesOffer(key,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   purchaseKey(key): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).purchaseKey(key,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   tradeKey(key1, key2): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).tradeKey(key1, key2,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   CreateTradeKeyOffer(key1, key2): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).createTradeOffer(key1, key2,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }


   CancelTradeKey(key): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).cancelTradeOffer(key,(error, result) => {
         if (!error) {
           resolve(result);

           console.log(result)
         } else {
           reject(error);
           console.log(error)
         }
        });
      })
     return p;
   }


   setKeyData(key, dataKey, dataValue): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).setKeyData(key.toString(), dataKey, dataValue,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           reject(error);

           console.log(error)
         }
        });
      })
     return p;
   }

   getKeyInfo(key): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).getKey(key,(error, result) => {
         if (!error) {
           result.push(key)

           resolve(result);
         } else {
           console.log(error)
           reject(error);

         }
        });
      })
     return p;
   }

    hex_to_ascii(str1): string{
   	  var hex  = str1.toString();
   	  var str = '';
   	  for (var n = 0; n < hex.length; n += 2) {
   		   str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
   	   }
   	   return str;
    }

   getKeyData(key, dataKey): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).getKeyData(key, dataKey,(error, result) => {
         if (!error) {

           console.log('getKeyData: ',result)
           result=this.hex_to_ascii(result)
           resolve(result);
           console.log(result)
         } else {
           reject(error);
           console.log(error)
         }
        });
      })
     return p;
   }


   getUrlFromKey(key): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).getUrlFromKey(key,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   logAccess(key, data): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).logAccess(key, data,(error, result) => {
         if (!error) {
           resolve(result);
         console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   message(from, to, category, data): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).message(from, to, category, data,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   log(from,data): any {
     let p = new Promise<any>((resolve, reject) => {
       this._contract.at(this.contractAddr).log(from,data,(error, result) => {
         if (!error) {
           resolve(result);
           console.log(result)
         } else {
           console.log(error)
         }
        });
      })
     return p;
   }


   weiToEth(wei: number): number {
       return parseFloat(this.web3.fromWei(wei, 'ether'));
   }




   sendTransaction(): any {
     var data = this.contract.transfer.getData(this.contractAddr, 10000, {from: this.addr});
     var gasPrice = this.web3.eth.gasPrice;
     var gasLimit = 90000;

     var rawTransaction = {
       "from": this.addr,
       "gasPrice": this.web3.toHex(gasPrice),
       "gasLimit": this.web3.toHex(gasLimit),
       "to": this.contractAddr,
       "value": "0",
       "data": data,
    "chainId": ''
  };

  // var tx = new Tx(rawTransaction);
  //
  // tx.sign(privKey);
  // var serializedTx = tx.serialize();

  this.web3.eth.sendTransaction(rawTransaction, function(err, hash) {
    if (!err)
      console.log(hash);
      else
      console.log(err);
    });
   }

   connected(): Promise<any> {
       let p = new Promise<any>((resolve, reject) => {


           if (this.nodeIP !== 'MetaMask') {


               this.web3.eth.sendTransaction({from: this.web3.eth.defaultAccount, to: this.web3.eth.defaultAccount, value: 0, gas: 0, gasPrice: 0 },
            //this.web3.eth.sendTransaction({from: this.web3.eth.accounts[0], to: this.web3.eth.accounts[0], value: 0, gas: 0, gasPrice: 0 },
                   (err, res) => {;
                       if (err.toString() !== 'Error: account is locked') {
                           this.unlockedAccount = this.web3.eth.accounts[0];
                           if (this.unlockedAccount) {
                             this.authorized.next(true);
                           }

                           this.update.emit(null);
                           console.log('Connected to account: ' + this.unlockedAccount);
                           resolve(true);
                       } else {
                           console.log('Error: Could not find an unlocked account: ',err);
                           resolve(false);
                       }
                   }
               );
           } else {
               this.unlockedAccount = this.web3.eth.accounts[0];
               if (this.unlockedAccount) {
                 this.authorized.next(true);
               }

               console.log('Connected to account: ' + this.unlockedAccount)
               resolve(false);
           }
       });
       return p;
   }

   handleConnection(connect: boolean): void {
       if (connect) {
           this.connected();
       } else {
           this.nodeIP = this.defaultNodeIP;
           this.connectToNode();
       }
       this.nodeConnected = connect;
   }

   connectToNode(): void { // Don't unlock until you send a transaction
      console.log('connecting: ',window['web3'])
      console.log('connecting: ',localStorage['nodeIP'])

       if (typeof window['web3'] !== 'undefined' && (!localStorage['nodeIP'] || this.nodeIP === 'MetaMask')) {
           localStorage['nodeIP'] = this.nodeIP;
           console.log('Using injected web3');
           this.web3 = new this.Web3(window['web3'].currentProvider);
           this.nodeIP = 'MetaMask';
           this.nodeConnected = true;
           this.unlockedAccount = 'MetaMask';
           this.update.emit(null);
           this.handleConnection(this.web3.isConnected());

       } else {
           localStorage['nodeIP'] = this.nodeIP;
           console.log('Using HTTP node;', this.nodeIP);
           this.unlockedAccount = undefined;

           this.web3 = new this.Web3(new this.Web3.providers.HttpProvider(this.nodeIP));
           this.handleConnection(this.web3.isConnected());
       }
   }


   get isConnected(): boolean {
       return this.nodeConnected;
   }

   get web3(): any {
       if (!this.web3Instance) {
           this.initializeWeb3();
       }
       return this.web3Instance;
   }
   set web3(web3: any) {
       this.web3Instance = web3;
   }

   get currentAcc(): string {
       return this.unlockedAccount;
   }
   get currentAddr(): string {
       return this.contractAddr;
   }
   set currentAddr(contractAddr: string) {
       if (contractAddr.length === 42 || contractAddr.length === 40) {
           this.contractAddr = contractAddr;
       } else {
           console.log('Invalid address used');
       }
   }
   get currentNode(): string {
       return this.nodeIP;
   }
   set currentNode(nodeIP: string) {
       this.nodeIP = nodeIP;
   }

   get Web3(): any {
       return window['Web3'];
   }

   get addingQuestion(): boolean {
       return this.adding;
   }

}
