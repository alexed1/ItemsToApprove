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
        switch (action.name) {
            case 'approve':
                alert('Showing Details: ' + JSON.stringify(row));
                break;
            case 'reject':
                alert('Showing Details: ' + JSON.stringify(row));
                break;
            case 'reassign':
                alert('Showing Details: ' + JSON.stringify(row));
                break;
            default : break;
        }
    }

   

    getSelectedName(event) {
        const selectedRows = event.detail.selectedRows;
        // Display that fieldName of the selected rows
        for (let i = 0; i < selectedRows.length; i++){
            alert("You selected: " + selectedRows[i].opportunityName);
        }
    }
}