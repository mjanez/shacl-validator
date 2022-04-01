package eu.europa.ec.itb.shacl.webhook;

import eu.europa.ec.itb.shacl.ModelPair;
import eu.europa.ec.itb.shacl.gitb.ValidationServiceImpl;
import eu.europa.ec.itb.shacl.validation.SHACLValidator;
import eu.europa.ec.itb.validation.commons.war.webhook.StatisticReporting;
import eu.europa.ec.itb.validation.commons.war.webhook.UsageData;
import org.apache.jena.rdf.model.*;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import javax.xml.ws.handler.MessageContext;
import java.util.HashMap;
import java.util.Map;

/**
 * Aspect that advises the application's entry points to extract and send usage statistics (if enabled).
 */
@Aspect
@Component
@ConditionalOnProperty(name = "validator.webhook.statistics")
public class StatisticReportingAspect extends StatisticReporting {

    private static final Logger logger = LoggerFactory.getLogger(StatisticReportingAspect.class);

    private static final ThreadLocal<Map<String, String>> adviceContext = new ThreadLocal<>();

    /**
     * Pointcut for minimal WEB validation.
     */
    @Pointcut("execution(public * eu.europa.ec.itb.shacl.upload.UploadController.handleUploadM(..))")
    private void minimalUploadValidation(){}

    /**
     * Pointcut for regular WEB validation.
     */
    @Pointcut("execution(public * eu.europa.ec.itb.shacl.upload.UploadController.handleUpload(..))")
    private void uploadValidation(){}


    /**
     * Advice to obtain the arguments passed to the web upload API call.
     *
     * @param joinPoint The original call's information.
     */
    @Before("minimalUploadValidation() || uploadValidation()")
    public void getUploadContext(JoinPoint joinPoint) {
        Map<String, String> contextParams = new HashMap<>();
        contextParams.put("api", StatisticReportingConstants.WEB_API);
        if(config.getWebhook().isStatisticsEnableCountryDetection()){
            HttpServletRequest request = getHttpRequest(joinPoint);
            if(request != null){
                String ip = extractIpAddress(request);
                contextParams.put("ip", ip);
            }
        }
        adviceContext.set(contextParams);
    }

    /**
     * Advice to obtain the arguments passed to the SOAP API call.
     *
     * @param joinPoint The original call's information.
     */
    @Before(value = "execution(public * eu.europa.ec.itb.shacl.gitb.ValidationServiceImpl.validate(..))")
    public void getSoapCallContext(JoinPoint joinPoint) {
        Map<String, String> contextParams = new HashMap<>();
        contextParams.put("api", StatisticReportingConstants.SOAP_API);
        if(config.getWebhook().isStatisticsEnableCountryDetection()){
            ValidationServiceImpl validationService = (ValidationServiceImpl)joinPoint.getTarget();
            HttpServletRequest request = (HttpServletRequest)validationService.getWebServiceContext().getMessageContext()
                    .get(MessageContext.SERVLET_REQUEST);
            String ip = extractIpAddress(request);
            contextParams.put("ip", ip);
        }
        adviceContext.set(contextParams);
    }

    /**
     * Pointcut for the single REST validation.
     */
    @Pointcut("execution(public * eu.europa.ec.itb.shacl.rest.ShaclController.validate(..))")
    private void singleRestValidation(){}

    /**
     * Pointcut for batch REST validation.
     */
    @Pointcut("execution(public * eu.europa.ec.itb.shacl.rest.ShaclController.validateMultiple(..))")
    private void multipleRestValidation(){}

    /**
     * Advice to obtain the arguments passed to the REST API call.
     *
     * @param joinPoint The original call's information.
     */
    @Before("singleRestValidation() || multipleRestValidation()")
    public void getRestCallContext(JoinPoint joinPoint) {
        String ip = null;
        Map<String, String> contextParams = new HashMap<>();
        contextParams.put("api", StatisticReportingConstants.REST_API);
        if(config.getWebhook().isStatisticsEnableCountryDetection()){
            HttpServletRequest request = getHttpRequest(joinPoint);
            if(request != null){
                ip = extractIpAddress(request);
                contextParams.put("ip", ip);
            }
        }
        adviceContext.set(contextParams);
    }

    /**
     * Advice to send the usage report.
     *
     * @param joinPoint The original call's information.
     */
    @Around("execution(public * eu.europa.ec.itb.shacl.validation.SHACLValidator.validateAll(..))")
    public Object reportValidatorDataUsage(ProceedingJoinPoint joinPoint) throws Throwable {
        SHACLValidator validator = (SHACLValidator) joinPoint.getTarget();
        Object report = joinPoint.proceed();
        try {
            Map<String, String> usageParams = adviceContext.get();
            String validatorId = config.getIdentifier();
            String domain = validator.getDomain();
            String validationType = validator.getValidationType();
            String api = usageParams.get("api");
            String ip = usageParams.get("ip");
            ModelPair reportModel = (ModelPair) report;
            // Obtain the result of the model
            UsageData.Result result = extractResult(reportModel.getReportModel());
            // Send the usage data
            sendUsageData(validatorId, domain, api, validationType, result, ip);
        } catch (Exception ex) {
            // Ensure unexpected errors never block validation processing
            logger.warn("Unexpected error during statistics reporting", ex);
        }
        return report;
    }

    /**
     * Method that receives the Jena Model report and extracts the number of errors and warnings.
     *
     * @param report The validation report model.
     * @return The overall validation result.
     */
    private UsageData.Result extractResult(Model report) {
        int warnings = 0;
        int errors = 0;

        NodeIterator validationResults = report
                .listObjectsOfProperty(report.getProperty("http://www.w3.org/ns/shacl#result"));
        while (validationResults.hasNext()) {
            StmtIterator statements = report.listStatements(validationResults.next().asResource(), null,
                    (RDFNode) null);
            while (statements.hasNext()) {
                Statement statement = statements.next();
                String severity = "";
                if (statement.getPredicate().hasURI("http://www.w3.org/ns/shacl#resultSeverity")) {
                    severity = statement.getObject().asResource().getURI();
                }
                if (!severity.isEmpty()) {
                    if (severity.equals("http://www.w3.org/ns/shacl#Warning")) {
                        warnings += 1;
                    } else if (severity.equals("http://www.w3.org/ns/shacl#Violation")) {
                        errors += 1;
                    }
                }
            }
        }
        if (errors > 0)
            return UsageData.Result.FAILURE; // ONE OR MORE ERRORS
        else if (warnings > 0)
            return UsageData.Result.WARNING; // ONE OR MORE WARNINGS, NO ERRORS
        else
            return UsageData.Result.SUCCESS; // ONLY INFOS
    }

}
