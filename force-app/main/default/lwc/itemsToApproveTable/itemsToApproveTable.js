/* eslint-disable no-console */
import { LightningElement, api,track, wire} from 'lwc';

import process from '@salesforce/apex/GetProcessInstanceData.process';

import GetProcessItemData from '@salesforce/apex/GetProcessInstanceData.getProcessItemData';

const actions = [
    { label: 'Approve', name: 'Approve' },
    { label: 'Reject', name: 'Reject' },
    { label: 'Reassign', name: 'Removed' }
];

export default class ItemsToApproveTable extends LightningElement {

    @api rowData;
    @api columns;
    @api actorId;
    @api mode='single';
    @api contextObjectType;
    @api fieldNames; //field names provided by called to be rendered as columns
    @track rowData;
    error;
    fieldDescribes; //not being used
    datatableColumnFieldDescriptorString

    connectedCallback () {
       console.log ('entering connected callback');
      //this.createColumns();
       this.getServerData();
       
       //this.setRowData();

       console.log('entering ItemstoApprove LWC');

       



      // break getFieldDescribes up into a true getFieldDescribes and a set Table Columns. return the field describes and store locally
//if mode is single, call getFieldDescribes and return locally


       //setTableColumns retrieves field types for the custom fields

       

       //setRowData will take the work items and call a function that does a query

    }



   
    //first, call apex to grab data. pass in mode.
       //regardless of mode:
       //retrieve workitems
       //if mode is single, get field describes
       //load row data, including fielddescribes if single.
       //return the rowdata, fielddescribes and column data
    getServerData() { 
        let instanceData = GetProcessItemData({ actorId: this.actorId, objectName: this.contextObjectType, fieldNames : this.fieldNames, mode : this.mode})
        .then(result => {
            console.log('getProcessItemData returns: ' + result);
            let processInstanceData = JSON.parse(result);
            this.datatableColumnFieldDescriptorString = processInstanceData.datatableColumnFieldDescriptorString;
            this.createColumns();
            this.rowData = this.createRowData(processInstanceData.rowData);
            })
            .catch(error => {
                console.log('error is: ' + JSON.stringify(error));
                this.error = error;
                return this.error;
            });

    }


    createColumns() {
        var fullColumns = '';
        if (this.mode.toLowerCase() === 'single') {
            fullColumns = this.createCustomColumns() + this.datatableColumnFieldDescriptorString + ']';
            console.log('columns set to ' + fullColumns);
            this.columns = JSON.parse(fullColumns);
        } else if (this.mode.toLowerCase() === 'mixed')  {
                fullColumns = this.createStandardColumns();
                console.log('columns set to ' + fullColumns);
                this.columns = JSON.parse(fullColumns);
        } else  {
            console.log('in error case');
            //this doesn't work:
            throw new Error('Unsupported value provided for Mode. Use Mixed or Single');
        }    
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
            this.showToast('Approval Management', action.name + ' Complete', 'success', true);
  
        })
        .catch(error => {
            console.log('error returning from process work item apex call is: ' + error);  
        });  
    }

    showToast(title, message, variant, autoClose) {
        this.template.querySelector('c-toast-message').showCustomNotice({
            detail: {
                title: title, message: message, variant: variant, autoClose: autoClose
            }
        });
    }

    createStandardColumns() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Type", "fieldName": "Type", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        columnDescriptor = columnDescriptor + ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}'
        columnDescriptor = '[' + columnDescriptor + ']';
        console.log('total standard columnDescriptor is:  ' + columnDescriptor);
        return columnDescriptor;
    }

    createCustomColumns() {
        var columnDescriptor = '{"label": "Submitter", "fieldName": "Submitter", "type": "text"}';
        columnDescriptor = columnDescriptor + ',{"label": "Record Name", "fieldName": "RecordURL", "type": "url", "typeAttributes": { "label": { "fieldName": "RecordName"}, "target": "_blank" }  }';
        
        columnDescriptor = columnDescriptor + ',{"type": "action", "typeAttributes": { "rowActions" : ' + JSON.stringify(actions) + ', "menuAlignment" : "left" }}'
        columnDescriptor = '[' + columnDescriptor ;
        return columnDescriptor;
        //given an object and a field name, find the type and label and return a valid string structure
       
    }

    createRowData(rowData) {
        var outputData = '';
        var inputData = JSON.parse(rowData);
        console.log('input data is: ' + rowData);
        inputData.forEach(element => {
           
            outputData = outputData + '{"Submitter" : "' + element.createdByName +'", "WorkItemId" : "' + element.workItemId + '", "ActorId" : "' + element.actorId + '", "TargetObjectId" : "' +  element.targetObjectId + '", "Type" : "' + element.contextRecordObjectType + '", "RecordName" : "' + element.contextRecordName + '", "RecordURL" : "' + element.contextRecordURL + '",'; 
            
            this.fieldNames.split(',').forEach(fieldName => {
                outputData = outputData + ' "' + fieldName + '" : "' + element[fieldName] + '",';
            })            
            
            outputData = outputData.slice(0,-1) + '},';
        
        });
        outputData = '[' +  outputData.slice(0,-1) + ']';
        console.log('outputData is: ' + outputData);
        return JSON.parse(outputData);
    }


}