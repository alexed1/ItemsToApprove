import { LightningElement, api, track } from 'lwc';

export default class DatatableFlow extends LightningElement {

    @api mydata;
    @api columns;
    @api keyfield;
    @api recordData;
    @api columnNamesCSV;


    handleRowAction(event){
        const action = event.detail.action;
        const row = event.detail.row;
        //rowactions should be handled by the parent.  
        this.dispatchRowActionEvent(row, action);

    }

    dispatchRowActionEvent(row, action) {
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
            console.log("You selected: " + selectedRows[i]);
        }
        this.dispatchRowSelectedEvent(selectedRows);
    }

    dispatchRowSelectedEvent(selectedRows) {
        //console.log('selectedrows is: ' + JSON.stringify(selectedRows));
        const rowSelected = new CustomEvent('rowselected', {
            bubbles: false, 
            detail: {selectedRows}
        });
        this.dispatchEvent(rowSelected);
    }
}