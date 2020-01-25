//get the steps associated with an actor (user or queue)
public with sharing class GetProcessInstanceSteps {
 

    @invocableMethod(label='Get Process Instance Steps' )
    public static List<Response> Retrieve (List<Request> requests) {

        String actorId = requests[0].actorId;
         
 
        List<ProcessInstanceWorkItem> curWorkItems = [SELECT Id, ActorId, ProcessInstanceId FROM ProcessInstanceWorkItem];
        System.debug('curWorkItems is: ' + curWorkItems);

        //
        //row data:
       /*  context recordid: 1  --->
               object type = Account
               recordID = '2342'
               recordname = 'bellona'
               processinstanceid = '234234' */



        Map<String, String> keyValuePair = new Map<String, String>();
        List<Map<String, String>> rowData = new List<Map<String, String>>();

        for (ProcessInstanceWorkItem curWorkItem : curWorkItems) {
            ProcessInstance curProcessInstance = [SELECT Id, ProcessDefinitionId, TargetObjectId, CreatedById FROM ProcessInstance where Id = :curWorkItem.ProcessInstanceId];
            ProcessDefinition curProcessDefinition = [SELECT Id, TableEnumOrId FROM ProcessDefinition where Id = :curProcessInstance.ProcessDefinitionId];
            String objectTypeName = curProcessDefinition.TableEnumOrId;
            String createdById  = curProcessInstance.CreatedById;
            String targetObjectId = curProcessInstance.TargetObjectId;

            String myQuery = 'SELECT Name FROM ' + objectTypeName + ' WHERE Id = :targetObjectId';
            SObject returnedObject = Database.query(myQuery);
            String contextRecordName = (String) returnedObject.get('Name');

            User createdByUser = [SELECT Name,Username FROM User where Id = :createdById];

            keyValuePair.put('processDefinitionId', curProcessInstance.ProcessDefinitionId);
            keyValuePair.put('createdById', createdById);
            keyValuePair.put('createdByUsername', createdByUser.Username);
            keyValuePair.put('createdByName', createdByUser.Name);
            keyValuePair.put('contextRecordName', contextRecordName);
            keyValuePair.put('contextRecordObjectType', objectTypeName);
            keyValuePair.put('contextRecordURL', getRecordURL(targetObjectId, objectTypeName));
            keyValuePair.put('targetObjectId', targetObjectId);

            rowData.add(keyValuePair);
        }
        System.debug('rowData is: ' + rowData);
        //report back the results
        Response response = new Response();
        response.curWorkItems = curWorkItems;
        response.stepData = JSON.serialize(rowData);//start from here. examine rowData structure after serialization.
        //System.debug('step data is: ' + response.stepData);

        List<Response> responseList = new List<Response>();
        responseList.add(response);
        return responseList;
    }

    public static String getRecordURL(String targetObjectId, String objectTypeName) {
        String baseURL = Url.getOrgDomainUrl().toExternalForm();
        String recordLink = baseURL + '/lightning/r/' + objectTypeName + '/' + targetObjectId + '/view';
        return recordLink;
    }


    public class Request {
        @invocableVariable
        public String actorId;
 
    }

    public class Response {
        @invocableVariable
        public Boolean isSuccess;

        @invocableVariable
        public String errors;

        @invocableVariable
        public String stepData;

        @invocableVariable
        public List<ProcessInstanceWorkItem> curWorkItems;

    }

    public class InvocableActionException extends Exception {
    }


}