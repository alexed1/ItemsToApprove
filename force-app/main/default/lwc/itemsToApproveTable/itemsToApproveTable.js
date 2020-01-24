/* eslint-disable no-console */
import { LightningElement, api, track } from 'lwc';
 

const actions = [
    { label: 'Approve', name: 'approve' },
    { label: 'Reject', name: 'reject' },
    { label: 'Reassign', name: 'reassign' }
];




export default class ItemsToApproveTable extends LightningElement {

    @api workItemData;
    @api rowData;
    @api columns;

    get columns() { 
        return this.createColumn();
    }

    get rowData() {
        return this.createRowData(this.workItemData);
    }
    
     connectedCallback () {
       
       console.log('entering ItemstoApprove LWC');
       
    }
    
    handleRowAction(event){
        
    }

    createColumn() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordName", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}'
        columnDescriptor = '[' + columnDescriptor + ']'; 
        console.log('columndescriptor is: ' + columnDescriptor);
        return JSON.parse(columnDescriptor);
    }
    createRowData(workItemData) {
        var outputData = ''; 
        var inputData = JSON.parse(workItemData);
        inputData.forEach(element => {
            outputData = outputData + '{"Submitter" : "' + element.createdByName + '", "Type" : "' + element.contextRecordObjectType + '", "RecordName" : "' + element.contextRecordName + '"},';
        });
        outputData = '[' + outputData.slice(0,-1) + ']';
        console.log('outputData is: ' + outputData);
        return JSON.parse(outputData);  
    }
   

}