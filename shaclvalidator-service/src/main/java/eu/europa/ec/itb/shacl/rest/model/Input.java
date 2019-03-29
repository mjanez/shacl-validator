package eu.europa.ec.itb.shacl.rest.model;

import java.util.List;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@ApiModel(description = "The content and metadata specific to input content that is to be validated.")
public class Input {

    public static final String embedding_URL     	= "URL" ;
    public static final String embedding_BASE64		= "BASE64" ;
    
    @ApiModelProperty(required = true, notes = "The RDF content to validate.")
	private String contentToValidate;
    @ApiModelProperty(notes = "The mime type of the provided RDF content (e.g. \"application/rdf+xml\", \"application/ld+json\", \"text/turtle\"). If not provided the type is determined from the provided content (if possible).")
	private String contentSyntax;
    @ApiModelProperty(notes = "The way in which to interpret the contentToValidate. If not provided, the method will be determined from the contentToValidate value (i.e. check it is a valid URL).", allowableValues = embedding_URL+","+embedding_BASE64)
	private String embeddingMethod;
    @ApiModelProperty(notes = "The type of validation to perform (e.g. the profile to apply or the version to validate against). This can be skipped if a single validation type is supported by the validator. Otherwise, if multiple are supported, the service should fail with an error.")
	private String validationType;
    @ApiModelProperty(notes = "The mime type for the validation report syntax. If none is provided \"application/rdf+xml\" is considered as the default.")
	private String reportSyntax;
    @ApiModelProperty(notes = "Any shapes to consider that are externally provided (i.e. provided at the time of the call).")
	private List<RuleSet> externalRules;

	public String getContentToValidate() { return this.contentToValidate; }
	
	public String getEmbeddingMethod() { return this.embeddingMethod; }
	
	public String getValidationType() { return this.validationType; }
	
	public String getReportSyntax() { return this.reportSyntax; }
	
	public String getContentSyntax() { return this.contentSyntax; }
	
	public List<RuleSet> getExternalRules(){ return this.externalRules; }
	
	public RuleSet getExternalRules(int value) { return this.externalRules.get(value); }

	public void setContentToValidate(String contentToValidate) {
		this.contentToValidate = contentToValidate;
	}

	public void setContentSyntax(String contentSyntax) {
		this.contentSyntax = contentSyntax;
	}

	public void setEmbeddingMethod(String embeddingMethod) {
		this.embeddingMethod = embeddingMethod;
	}

	public void setValidationType(String validationType) {
		this.validationType = validationType;
	}

	public void setReportSyntax(String reportSyntax) {
		this.reportSyntax = reportSyntax;
	}

	public void setExternalRules(List<RuleSet> externalRules) {
		this.externalRules = externalRules;
	}

	public class RuleSet{
	    @ApiModelProperty(required = true, notes = "The RDF containing the rules to apply (shapes).")
		private String ruleSet;
	    @ApiModelProperty(notes = "The way in which to interpret the value for ruleSet. If not provided, the method will be determined from the ruleSet value (i.e. check it is a valid URL).", allowableValues = embedding_URL+","+embedding_BASE64)
		private String embeddingMethod;
		
		public String getRuleSet() { return this.ruleSet; }
		
		public String getEmbeddingMethod() { return this.embeddingMethod; }

		public void setRuleSet(String ruleSet) {
			this.ruleSet = ruleSet;
		}

		public void setEmbeddingMethod(String embeddingMethod) {
			this.embeddingMethod = embeddingMethod;
		}
	}
}
