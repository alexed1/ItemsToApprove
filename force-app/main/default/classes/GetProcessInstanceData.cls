//get the steps associated with an actor (user or queue)
public with sharing class GetProcessInstanceData {
 

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
 


    @AuraEnabled
    public static String retrieve (String actorId) {
 
        List<ProcessInstanceWorkItem> curWorkItems = [SELECT Id, ActorId, ProcessInstanceId FROM ProcessInstanceWorkItem WHERE ActorId = :actorId];
        System.debug('curWorkItems for actor ' + actorId + ' is: ' + curWorkItems);
        
        List<Map<String, String>> rowData = new List<Map<String, String>>();

        for (ProcessInstanceWorkItem curWorkItem : curWorkItems) {
            Map<String, String> keyValuePair = new Map<String, String>();
            ProcessInstance curProcessInstance = [SELECT Id, ProcessDefinitionId, TargetObjectId, CreatedById FROM ProcessInstance where Id = :curWorkItem.ProcessInstanceId];
            System.debug('curProcessInstance is: ' + curProcessInstance);
            ProcessDefinition curProcessDefinition = [SELECT Id, TableEnumOrId FROM ProcessDefinition where Id = :curProcessInstance.ProcessDefinitionId];
            String objectTypeName = curProcessDefinition.TableEnumOrId;
            String createdById  = curProcessInstance.CreatedById;
            String targetObjectId = curProcessInstance.TargetObjectId;
           
            User createdByUser = [SELECT Name,Username FROM User where Id = :createdById];

            keyValuePair.put('processDefinitionId', curProcessInstance.ProcessDefinitionId);
            keyValuePair.put('createdById', createdById);
            keyValuePair.put('createdByUsername', createdByUser.Username);
            keyValuePair.put('createdByName', createdByUser.Name);
            keyValuePair.put('contextRecordObjectType', objectTypeName);
            keyValuePair.put('contextRecordURL', getRecordURL(targetObjectId, objectTypeName));
            keyValuePair.put('targetObjectId', targetObjectId);
            keyValuePair.put('actorId', curWorkItem.ActorId);
            keyValuePair.put('workItemId', curWorkItem.Id);

            String myQuery = 'SELECT Name FROM ' + objectTypeName + ' WHERE Id = :targetObjectId';
            SObject returnedObject = Database.query(myQuery);
            String contextRecordName = (String) returnedObject.get('Name');
            keyValuePair.put('contextRecordName', contextRecordName);

            rowData.add(keyValuePair);
            
        }
        System.debug('rowData is: ' + rowData);
        //report back the results
        
        System.debug('returning: ' + JSON.serialize(rowData));
        return JSON.serialize(rowData);
    }

    public static String getRecordURL(String targetObjectId, String objectTypeName) {
        String baseURL = Url.getOrgDomainUrl().toExternalForm();
        String recordLink = baseURL + '/lightning/r/' + objectTypeName + '/' + targetObjectId + '/view';
        return recordLink;
    }



}