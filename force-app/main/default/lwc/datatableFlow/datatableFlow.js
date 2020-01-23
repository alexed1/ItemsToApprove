import { LightningElement, api, track } from 'lwc';

export default class DatatableFlow extends LightningElement {

    @api mydata;
    @api columns;
    @api keyfield;

    //@track _columns;

  /*   get columns(){
        return this._columns;
    }
    set columns(value) {
        this._columns = this.columns;
        console.log ('_columns  and column in datatable is: ' + JSON.stringify(this._columns));
    }  
     */

    getSelectedName(event) {
        const selectedRows = event.detail.selectedRows;
        // Display that fieldName of the selected rows
        for (let i = 0; i < selectedRows.length; i++){
            alert("You selected: " + selectedRows[i].opportunityName);
        }
    }
}