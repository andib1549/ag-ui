import { inject, bindable, computedFrom } from 'aurelia-framework';
import { Dialog } from '../../../components/dialog/dialog';
import { Router } from 'aurelia-router';
import { AzureService } from './service';
import { activationStrategy } from 'aurelia-router';

import SupplierLoader from '../../../loader/supplier-loader';
import BankLoader from '../../../loader/account-banks-loader';

import Service from './service';

@inject(Router, Service, Dialog)
export class Create {
    controlOptions = {
        label: {
            length: 4,
        },
        control: {
            length: 4,
        },
    };

    formOptions = {
        cancelText: 'Kembali',
        saveText: 'Simpan',
    };

    constructor(router, service, dialog) {
        this.router = router;
        this.service = service;
        this.dialog = dialog;
        this.data = {};

        this.collection = {
            columns: ['__check', 'No. Disposisi', 'Tanggal Disposisi', 'Tanggal Jatuh Tempo', 'Nomor Proforma/Invoice', 'Supplier','Kategori','Divisi', 'PPN', 'Jumlah dibayar ke Supplier', 'Mata Uang', ''],
        };
    }

    determineActivationStrategy() {
        return activationStrategy.replace;
    }

    cancelCallback(event) {
        this.router.navigateToRoute('list');
    }

    onCheckAll(event) {
        for (var item of this.Items) {
            item.Select = event.detail.target.checked;
        }
    }

    saveCallback(event) {
        // var dataPrep=this.data;
        // var items=[];
        // for(var a of this.data.Items){
        //     if(a.Select){
        //         items.push(a);
        //     }
        // }
        // dataPrep.Items =items;
        // console.log(dataPrep)
        this.data.Items = this.Items.filter((item) => item.Select);
        var dataPrep = this.data;
        this.dialog.prompt("Apakah anda yakin akan menyimpan data?", "Simpan Data")
            .then(response => {
                if (response == "ok") {
                    this.service.create(dataPrep)
                        .then(result => {
                            alert('Data berhasil dibuat');
                            this.router.navigateToRoute('create', {}, { replace: true, trigger: true });
                        })
                        .catch(e => {
                            this.error = e;
                        });
                }
            });
    }

    get supplierLoader() {
        return SupplierLoader;
    }

    get bankLoader() {
        return BankLoader;
    }

    @bindable selectedSupplier;
    async selectedSupplierChanged(newVal, oldVal) {
        this.data.Supplier = newVal;
        if (newVal) {
            this.data.Supplier.Id=newVal._id;
            this.data.Supplier.Name=newVal.name;
            this.data.Supplier.Code=newVal.code;
            this.data.Supplier.Import=newVal.import;
            if (this.selectedBank && this.selectedBank.Currency.Code) {
                let arg = {
                    page: 1,
                    size: Number.MAX_SAFE_INTEGER,
                    filter: JSON.stringify({ "CurrencyCode": this.selectedBank.Currency.Code, "SupplierCode": newVal.code, "IsPaid": false , "Position":"7"}) //CASHIER DIVISION
                };
                await this.DispositionData(arg);
            }
        }
    }

    @computedFrom("selectedBank && selectedSupplier")
    get isExistBankAndSupplier() {
        if (this.selectedBank && this.selectedSupplier)
            return true;
        else
            return false;
    }

    async DispositionData(arg){
        this.Items = await this.service.searchDispoEx(arg)
            .then((result) => {
                var expeditionDatas=[];
                for(var ex of result.data){
                    ex.purchasingDispositionExpeditionId=ex.Id;
                    delete ex.Id;
                    for(var exItem of ex.items){
                        exItem.purchasingDispositionExpeditionItemId= exItem.Id;
                        delete exItem.Id;
                    }
                    expeditionDatas.push(ex);
                }
                return expeditionDatas;
            });
    }

    
    // isExistBankAndSupplier = false;
    Items = [];
    currency = "";
    @bindable selectedBank;
    async selectedBankChanged(newVal) {
        this.data.AccountBank = newVal;
        if (newVal) {
            if(this.selectedSupplier){
                let arg = {
                    page: 1,
                    size: Number.MAX_SAFE_INTEGER,
                    filter: JSON.stringify({"CurrencyCode": this.selectedBank.Currency.Code, "SupplierCode": this.selectedSupplier.code, "IsPaid": false, "Position":"7" }) 
                };
                await this.DispositionData(arg);
            }
            //this.isExistBankAndSupplier = true;
            this.currency = newVal.Currency.Code;
        } else {
            this.currency = "";
            this.Items = [];
        }
    }

    get grandTotal() {
        let result = 0;
        if (this.Items && this.Items.length > 0) {
            for (let detail of this.Items) {
                if (detail.Select)
                    result += detail.payToSupplier;
            }
        }
        this.data.Amount = result;
        return result;
    }

    bankView(bank) {
        return bank.AccountName ? `${bank.AccountName} - ${bank.BankName} - ${bank.AccountNumber} - ${bank.Currency.Code}` : '';
    }

    supplierView(supp) {
        return `${supp.code}-${supp.name}`;
    }
}
