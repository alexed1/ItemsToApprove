public with sharing class DeleteApprovalProcess {
  
    @invocableMethod(label='Delete Approval' )
    public static List<Response> execute (List<Request> requests) {

        String appId = requests[0].id;
        String appName = requests[0].name;
        String error;

       // ApprovalProcess targetProcess = [SELECT Id, Name FROM ApprovalProcess WHERE Name = :appName];
        //System.debug('targetProcess is: ' + targetProcess);

        /* MetadataConnection metadataConnection;  

        try {
            DeleteResult[] results = metadataConnection.deleteMetadata(
                    'CustomObject', new String[] { 'MyCustomObject1__c',
                            'MyCustomObject2__c' });

            for (DeleteResult r : results) {
                if (r.isSuccess()) {
                    System.debug('Deleted component: ' + r.getFullName());
                } else {
                    System.out
                            .println('Errors were encountered while deleting '
                                    + r.getFullName());
                    for (Error e : r.getErrors()) {
                        System.out.println('Error message: ' + e.getMessage());
                        System.out.println('Status code: ' + e.getStatusCode());
                    }
                }
            }
        } catch (ConnectionException ce) {
            ce.printStackTrace();
        } */

        
        MetadataService.MetadataPort service = createService();
        List<MetadataService.DeleteResult> results =
            service.deleteMetadata(
                'ApprovalProcess', new String[] { appName });
        handleDeleteResults(results[0]);


        


        /* try {
                delete targetProcess;
        } 
        catch (Exception e) {
            System.debug ('exception occured: ' + e.getMessage());
            error = e.getMessage();
        } */


        
 
        //report back the results
        Response response = new Response();
        response.errors = error;

        List<Response> responseList = new List<Response>();
        responseList.add(response);
        return responseList;
    }

    public static void handleDeleteResults(MetadataService.DeleteResult deleteResult) {
        // Nothing to see?
        if(deleteResult==null || deleteResult.success)
            return;
        // Construct error message and throw an exception
        if(deleteResult.errors!=null)
        {
            List<String> messages = new List<String>();
            messages.add(
                (deleteResult.errors.size()==1 ? 'Error ' : 'Errors ') +
                    'occured processing component ' + deleteResult.fullName + '.');
            for(MetadataService.Error error : deleteResult.errors)
                messages.add(
                    error.message + ' (' + error.statusCode + ').' +
                    ( error.fields!=null && error.fields.size()>0 ?
                        ' Fields ' + String.join(error.fields, ',') + '.' : '' ) );
            if(messages.size()>0)
                throw new MetadataServiceExamplesException(String.join(messages, ' '));
        }
        if(!deleteResult.success)
            throw new MetadataServiceExamplesException('Request failed with no specified error.');
    }


    

    public static MetadataService.MetadataPort createService()
    {
        MetadataService.MetadataPort service = new MetadataService.MetadataPort();
        service.SessionHeader = new MetadataService.SessionHeader_element();
        service.SessionHeader.sessionId = UserInfo.getSessionId();
        return service;
    }


    public class Request {
        @invocableVariable
        public String name;

        @invocableVariable
        public String id;
 
    }

    public class Response {
        @invocableVariable
        public Boolean isSuccess;

        @invocableVariable
        public String errors;

    }

    public class InvocableActionException extends Exception {
    }

    public class MetadataServiceExamplesException extends Exception { }
}
