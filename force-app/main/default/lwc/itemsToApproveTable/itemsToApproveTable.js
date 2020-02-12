/* eslint-disable no-console */
import { LightningElement, api,track} from 'lwc';
import retrieve from '@salesforce/apex/GetProcessInstanceData.retrieve';
import process from '@salesforce/apex/GetProcessInstanceData.process';

const actions = [
    { label: 'Approve', name: 'Approve' },
    { label: 'Reject', name: 'Reject' },
    { label: 'Reassign', name: 'Removed' }
];




export default class ItemsToApproveTable extends LightningElement {

    @api rowData;
    @api columns;
    @api actorId;
    @track rowData;
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



     connectedCallback () {
       this.retrieveWorkItems();
       console.log('entering ItemstoApprove LWC');

    }

    retrieveWorkItems () {
        console.log('retrieving process work items for user: ' + this.actorId);
        retrieve({ actorId: this.actorId})
            .then(result => {
                console.log('result is: ' + result);
                this.rowData = this.createRowData(result);
            })
            .catch(error => {
                console.log('error is: ' + error);
                this.error = error;
                return this.error;
            });
    }
    //receive event from child datatable
    handleRowAction(event){
        console.log('entering handleRowAction in itemsToApproveTable.js');
        const action = event.detail.action;
        let row = event.detail.row;
        console.log('action is: ' + JSON.stringify(action));
        console.log('row.ActorId is:' + row.ActorId);
        console.log('action.name is: ' + action.name);
        console.log('workitemid is: ' + row.WorkItemId);
        const workItemIds = [];
        workItemIds.push(row.WorkItemId);
        const processResult = process({ actorId: row.ActorId, action : action.name, workItemIds : workItemIds})
        .then(result => {
            console.log('result from process call is: ' + result);
            this.retrieveWorkItems();
        })
        .catch(error => {
            console.log('error returning from process work item apex call is: ' + error);
             
             
        });
         
         
        
        
    }

    createColumn() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        //columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "https://www.salesforce.com", "type": "url",  typeAttributes: { label: "foobar" } }';

        columnDescriptor = columnDescriptor + ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}'
        columnDescriptor = '[' + columnDescriptor + ']';
        //console.log('columndescriptor is: ' + columnDescriptor);
        return JSON.parse(columnDescriptor);
    }
    createRowData(workItemData) {
        var outputData = '';
        var inputData = JSON.parse(workItemData);
        console.log('input data is: ' + workItemData);
        inputData.forEach(element => {
           
            outputData = outputData + '{"Submitter" : "' + element.createdByName +'", "WorkItemId" : "' + element.workItemId + '", "ActorId" : "' + element.actorId + '", "TargetObjectId" : "' +  element.targetObjectId + '", "Type" : "' + element.contextRecordObjectType + '", "RecordName" : "' + element.contextRecordName + '", "RecordURL" : "' + element.contextRecordURL + '"},';
        });
        outputData = '[' +  outputData.slice(0,-1) + ']';
        console.log('outputData is: ' + outputData);
        return JSON.parse(outputData);
    }


}