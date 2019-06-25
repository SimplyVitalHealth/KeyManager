import { Component, OnInit } from '@angular/core';

// import * as Web3 from 'web3';
// import Web3 from 'web3';


@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {

  constructor() { 

    const Web3 = require('web3');
    console.log(window);
    
    window.addEventListener('load', async () => {
      // Modern dapp browsers...
      let web3: any;
      if ((window as any)['ethereum']) {
        web3 = new Web3((window as any)['ethereum']);
        try {
          // Request account access if needed
          let res = await (window as any)['ethereum'].enable();
          console.log(res)
        } catch (error) {
          // User denied account access...
        }
      }
      // Legacy dapp browsers...
      else if ((window as any)['web3']) {
        web3 = new Web3((window as any)['web3'].currentProvider);
        // Acccounts always exposed
      }
      // Non-dapp browsers...
      else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
        // return dispatch(setMetamaskLoadingStage('Error'))
      }
    });
  }

  ngOnInit() { 
    
  }

  reloadPage() {
    if (!window.hasOwnProperty('web3')) {
      (window as any)['ethereum'].enable();
    } else {
      location.reload();
    }
  }

}
