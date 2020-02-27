//get the steps associated with an actor (user or queue)
public with sharing class GetProcessInstanceData {
 
    //this is just a convenient way to return two very different pieces of data to the component
    public class ProcessInstanceData {
        String rowData;
        String datatableColumnFieldDescriptorString;
    }
 
    @AuraEnabled
    public static string getProcessItemData(String actorId, String fieldNames, String objectName, List<SObject> targetRecords){
        ProcessInstanceData curPID = new ProcessInstanceData();
        curPID= generateColumnDescriptionForCustomColumns( curPID, fieldNames,  objectName);
        curPID.rowData = getRowData(actorId, fieldNames);
        return JSON.serialize(curPID);  
    }

    //get field information (label, type, name) corresponding to custom fields the user wants to display
    @AuraEnabled
    public static ProcessInstanceData generateColumnDescriptionForCustomColumns(ProcessInstanceData curPID, String customFieldNames, String objectName) {
        System.debug('for object: ' + objectName );
        System.debug('for fieldnames: ' + customFieldNames );
        SObjectType sobjType = ((SObject)(Type.forName('Schema.'+objectName).newInstance())).getSObjectType();
        DescribeSObjectResult objDescribe = sobjType.getDescribe();
      
        System.debug('objDescribe is: ' + objDescribe);

        String datatableColumnFieldDescriptor = '';
        String fieldType = '';
        List<Schema.DescribeFieldResult> curFieldDescribes = new List<Schema.DescribeFieldResult>();

        for (String fieldName : customFieldNames.split(',')) {
           System.debug('for field: ' + fieldName);

           Map<String, Schema.SObjectField> fieldMap = objDescribe.fields.getMap();
           Schema.SObjectField fieldItem = fieldMap.get(fieldName);
           if (fieldItem == null) 
                throw new MyApexException('could not find the field: ' + fieldName + 'on the object ' + objectName);
           Schema.DescribeFieldResult dfr = fieldItem.getDescribe();
           curFieldDescribes.add(dfr);
           datatableColumnFieldDescriptor = datatableColumnFieldDescriptor + ',{"label" : "' + dfr.getLabel() + '", "fieldName" : "' + fieldName + '", "type" : "' + convertType(dfr.getType().name()) + '"}';

        }
        System.debug('final fieldDescribe string is: ' + datatableColumnFieldDescriptor); 

        //curPID.fieldDescribes = curFieldDescribes;
        curPID.datatableColumnFieldDescriptorString = datatableColumnFieldDescriptor;
        return curPID;
        
    }


    
    public static String getRowData (String actorId, String fieldNames ) {
 
        //in approval processes, work items represent individual tasks assigned to an approver
        List<ProcessInstanceWorkItem> curWorkItems = [SELECT Id, ActorId, ProcessInstanceId FROM ProcessInstanceWorkItem WHERE ActorId = :actorId];
        System.debug('curWorkItems for actor ' + actorId + ' is: ' + curWorkItems);
        
        List<Map<String, String>> rowData = new List<Map<String, String>>();

        for (ProcessInstanceWorkItem curWorkItem : curWorkItems) {
            //valueMap aggregates record and metadata from a variety of sources and turns it into a map that can be passed as row data to datatable
            Map<String, String> valueMap = new Map<String, String>();
            ProcessInstance curProcessInstance = [SELECT Id, ProcessDefinitionId, TargetObjectId, CreatedById FROM ProcessInstance where Id = :curWorkItem.ProcessInstanceId];
            System.debug('curProcessInstance is: ' + curProcessInstance);
            ProcessDefinition curProcessDefinition = [SELECT Id, TableEnumOrId FROM ProcessDefinition where Id = :curProcessInstance.ProcessDefinitionId];
            String objectTypeName = curProcessDefinition.TableEnumOrId;
            String createdById  = curProcessInstance.CreatedById;
            String targetObjectId = curProcessInstance.TargetObjectId;
           
            User createdByUser = [SELECT Name,Username FROM User where Id = :createdById];

            //a row of data about an approval task can consist of data from a variety of sources
            //first get values related to the approval process and the submitter
            valueMap.put('processDefinitionId', curProcessInstance.ProcessDefinitionId);
            valueMap.put('createdById', createdById);
            valueMap.put('createdByUsername', createdByUser.Username);
            valueMap.put('createdByName', createdByUser.Name);
            valueMap.put('contextRecordObjectType', objectTypeName);
            
            valueMap.put('targetObjectId', targetObjectId);
            valueMap.put('actorId', curWorkItem.ActorId);
            valueMap.put('workItemId', curWorkItem.Id);

            //then get fields related to the underlying record
            valueMap = getRecordData ( valueMap, targetObjectId,  fieldNames,  objectTypeName );
            
            rowData.add(valueMap);
            
        }
        
        System.debug('returning: ' + JSON.serialize(rowData));
        return JSON.serialize(rowData);
    }

    public static Map<String, String>  getRecordData (Map<String, String> valueMap, String targetObjectId, String fieldNames, String objectTypeName ) {
        valueMap.put('contextRecordURL', getRecordURL(targetObjectId, objectTypeName));
        //get data about the underlying records
        String myQuery = 'SELECT Name,' +  fieldNames    +' FROM ' + objectTypeName + ' WHERE Id = :targetObjectId';
        SObject returnedObject = Database.query(myQuery);
        String contextRecordName = (String) returnedObject.get('Name');
        valueMap.put('contextRecordName', contextRecordName);

        for(String field : fieldNames.split(',')) {
            valueMap.put(field, ToString(returnedObject.get(field), field));
        }
        System.debug('returning valuemap from getRecordData: ' + valueMap);
        return valueMap;
    }


    public static String ToString (Object fieldValue, String fieldName ) {
        if (fieldValue == null) 
            return '';   
        return fieldValue.toString();
    }


    public class MyApexException extends Exception {
    }

    //convert the apex type to the corresponding javascript type that datatable will understand
    private static String convertType (String apexType){
        switch on apexType {
            when 'STRING','PICKLIST' {
                return 'text';
            }
            when 'DATE' {
                return 'date';
            }
            when else {
                throw new MyApexException ('the field type is: ' + apexType + ' and convertType doesnt have a javascript equivalent ');
            }
        }
    }

    //handle menu actions taken by the user
    @AuraEnabled 
    public static String process(String actorId, String action, List<String> workItemIds){
       
        System.debug('passed in actorId is: ' + actorId);
        System.debug('passed in action is: ' + action);


        List<Approval.ProcessWorkItemRequest> listProcWrkItmReq = new List<Approval.ProcessWorkItemRequest>();
        for ( String curWorkItemId :workItemIds) 
        {
                System.debug('entering loop in getWorkItem');
                Approval.ProcessWorkItemRequest pwr = new Approval.ProcessWorkItemRequest();
                pwr.SetComments('Automatic Transition: ' + action);
                pwr.setWorkItemId(curWorkItemId);
                pwr.setAction(action);  // Application will show Process Status as "Recalled"
                //listProcWrkItmReq.add(pwr);
                System.debug('pwr is: ' + pwr);
                Approval.ProcessResult pr = Approval.process(pwr);
                //System.debug('Approved ProcessInstance ID :' + curWorkItem.ProcessInstanceId );
        }
        return 'foo';    
    }

    public static String getRecordURL(String targetObjectId, String objectTypeName) {
        String baseURL = Url.getOrgDomainUrl().toExternalForm();
        String recordLink = baseURL + '/lightning/r/' + objectTypeName + '/' + targetObjectId + '/view';
        return recordLink;
    }



}