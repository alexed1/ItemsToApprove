import { LightningElement, api, track } from 'lwc';

export default class DatatableFlow extends LightningElement {

    @api mydata;
    @api columns;
    @api keyfield;
    @api recordData
    @api columnNamesCSV


    handleRowAction(event){
        const action = event.detail.action;
        const row = event.detail.row;
        //rowactions should be handled by the parent.  
        this.dispatchChangeEvent(row, action);

    }

    dispatchChangeEvent(row, action) {
        const rowActionTaken = new CustomEvent('rowactiontaken', {
            bubbles: false, 
            detail: {row, action}
        });
        this.dispatchEvent(rowActionTaken);
    }
   

    getSelectedName(event) {
        const selectedRows = event.detail.selectedRows;
        // Display that fieldName of the selected rows
        for (let i = 0; i < selectedRows.length; i++){
            alert("You selected: " + selectedRows[i].opportunityName);
        }
    }
}