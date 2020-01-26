/* eslint-disable no-console */
import { LightningElement, api, wire } from 'lwc';
import retrieve from '@salesforce/apex/GetProcessInstanceData.retrieve';

const actions = [
    { label: 'Approve', name: 'approve' },
    { label: 'Reject', name: 'reject' },
    { label: 'Reassign', name: 'reassign' }
];




export default class ItemsToApproveTable extends LightningElement {

    //@api workItemData;
    @api rowData;
    @api columns;
    @api actorId;
    error;
    //DONE convert apex class to get called from here. 
    //restructure flow
    //pass up to apex the field name list
    //contextobjecttype
    //fieldnames is a csv corresponding to the context object type name
    //both createcolumn and create rowdata call for extra items
    //split the csv. for each field, add a column
    //in the row data, extract the field value from the record

    

    get columns() { 
        return this.createColumn();
    }

    get rowData() {
        retrieve()
            .then(result => {
                console.log('result is: ' + result);
                return this.createRowData(result);
            })
            .catch(error => {
                console.log('error is: ' + error);
                this.error = error;
                return this.error;
            });
       
        return [];
    
    }
    
     connectedCallback () {
       
       console.log('entering ItemstoApprove LWC');
       
    }
    
    handleRowAction(event){
        
    }

    createColumn() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        //columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "https://www.salesforce.com", "type": "url",  typeAttributes: { label: "foobar" } }';
       
        columnDescriptor = columnDescriptor + ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}'
        columnDescriptor = '[' + columnDescriptor + ']'; 
        console.log('columndescriptor is: ' + columnDescriptor);
        return JSON.parse(columnDescriptor);
    }
    createRowData(workItemData) {
        var outputData = ''; 
        var inputData = JSON.parse(workItemData);
        console.log('input data is: ' + workItemData);
        inputData.forEach(element => {
            outputData = outputData + '{"Submitter" : "' + element.createdByName + '", "Type" : "' + element.contextRecordObjectType + '", "RecordName" : "' + element.contextRecordName + '", "RecordURL" : "' + element.contextRecordURL + '"},';
        });
        outputData = '[' + outputData.slice(0,-1) + ']';
        console.log('outputData is: ' + outputData);
        return JSON.parse(outputData);  
    }
   

}