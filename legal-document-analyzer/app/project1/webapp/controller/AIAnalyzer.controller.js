sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "project1/service/DataService"
], (Controller, JSONModel, MessageToast, MessageBox, DataService) => {
    "use strict";

    return Controller.extend("project1.controller.AIAnalyzer", {

        onInit() {
            this._initializeModel();
            this._initializeDataService();
        },

        _initializeDataService() {
            // Initialize shared data service
            this._dataService = new DataService();
        },

        _initializeModel() {
            const aiModel = new JSONModel({
                hasDocument: false,
                hasFile: false,
                hasAnalysis: false,
                hasQAResults: false,
                isProcessing: false,
                processingMessage: "",
                documentText: "",
                currentQuestion: "",
                analysisResult: "",
                qaResults: [],
                documentInfo: "",
                originalDocumentTitle: "",
                analysisTimestamp: null
            });

            this.getView().setModel(aiModel, "aiModel");
        },

        onNavigateToDashboard() {
            const router = this.getOwnerComponent().getRouter();
            router.navTo("RouteDashboard");
        },

        onDocumentTextChange(oEvent) {
            const oModel = this.getView().getModel("aiModel");
            const sText = oEvent.getParameter("value");

            // Update hasDocument based on whether there's text
            const hasDocument = sText && sText.trim().length > 0;
            oModel.setProperty("/hasDocument", hasDocument);

            if (hasDocument) {
                oModel.setProperty("/documentInfo", `Text entered: ${sText.length} characters`);
            } else {
                oModel.setProperty("/documentInfo", "");
            }
        },

        onUseSampleDocument() {
            const sampleContract = `SOFTWARE DEVELOPMENT AGREEMENT

This Software Development Agreement ("Agreement") is entered into on January 1, 2024, between TechCorp Inc., a Delaware corporation ("Developer"), and Enterprise Client Corp., a California corporation ("Client").

1. SCOPE OF WORK
Developer agrees to develop a custom enterprise software application including:
- User management system
- Document processing capabilities
- AI-powered analytics dashboard
- Mobile-responsive interface

2. PAYMENT TERMS
Client agrees to pay Developer a total of $850,000, payable as follows:
- $170,000 upon signing this agreement (20%)
- $255,000 upon completion of Phase 1 (30%)
- $255,000 upon completion of Phase 2 (30%)
- $170,000 upon final delivery and acceptance (20%)

3. TIMELINE
The project shall be completed within 18 months from the effective date.

4. INTELLECTUAL PROPERTY
All developed software shall be owned by Client upon full payment.

5. TERMINATION
Either party may terminate this agreement with 60 days written notice.

6. LIABILITY
Developer's liability is limited to the total amount paid under this agreement.`;

            const oModel = this.getView().getModel("aiModel");
            oModel.setProperty("/documentText", sampleContract);
            oModel.setProperty("/hasDocument", true);
            oModel.setProperty("/hasAnalysis", false);
            oModel.setProperty("/hasQAResults", false);
            oModel.setProperty("/originalDocumentTitle", "Sample Software Development Agreement");
            oModel.setProperty("/documentInfo", "Sample Software Development Agreement");

            MessageToast.show("Sample contract loaded - ready for AI analysis!");
        },

        onFileChange(oEvent) {
            const oModel = this.getView().getModel("aiModel");
            const oFileUploader = oEvent.getSource();
            const oFile = oFileUploader.oFileUpload.files[0];

            if (oFile) {
                oModel.setProperty("/hasFile", true);
                oModel.setProperty("/originalDocumentTitle", oFile.name);
                oModel.setProperty("/documentInfo", `File selected: ${oFile.name} (${(oFile.size / 1024).toFixed(1)} KB)`);
                MessageToast.show("File selected. Click 'Extract Text' to process.");
            } else {
                oModel.setProperty("/hasFile", false);
                oModel.setProperty("/originalDocumentTitle", "");
                oModel.setProperty("/documentInfo", "");
            }
        },

        async onExtractText() {
            const oFileUploader = this.byId("fileUploader");
            const oFile = oFileUploader.oFileUpload.files[0];

            if (!oFile) {
                MessageToast.show("Please select a file first");
                return;
            }

            const oModel = this.getView().getModel("aiModel");
            oModel.setProperty("/isProcessing", true);
            oModel.setProperty("/processingMessage", "Extracting text from file...");

            try {
                let extractedText = "";

                if (oFile.type === "text/plain") {
                    // Handle text files
                    const text = await this._readFileAsText(oFile);
                    extractedText = text;
                } else if (oFile.type === "application/pdf") {
                    // For PDF files, use the backend service
                    extractedText = await this._extractPDFText(oFile);
                } else if (oFile.type.includes("word") || oFile.name.endsWith('.docx') || oFile.name.endsWith('.doc')) {
                    // For Word documents, use the backend service
                    extractedText = await this._extractWordText(oFile);
                } else {
                    // Try to read as text
                    const text = await this._readFileAsText(oFile);
                    extractedText = text;
                }

                if (extractedText && extractedText.trim().length > 0) {
                    oModel.setProperty("/documentText", extractedText);
                    oModel.setProperty("/hasDocument", true);
                    oModel.setProperty("/hasAnalysis", false);
                    oModel.setProperty("/hasQAResults", false);
                    oModel.setProperty("/documentInfo", `Text extracted from: ${oFile.name} (${extractedText.length} characters)`);

                    MessageToast.show("Text extracted successfully!");
                } else {
                    throw new Error("No text could be extracted from the file");
                }

            } catch (error) {
                MessageToast.show("Could not extract text from this file. Please copy and paste the text manually, or try 'Use Sample Contract' to test the AI features.");
                console.error("Text extraction error:", error);
            } finally {
                oModel.setProperty("/isProcessing", false);
            }
        },

        _readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        },

        async _extractPDFText(file) {
            // Use the new backend service for PDF extraction
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract-text', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.extractedText) {
                        return result.extractedText;
                    } else {
                        throw new Error(result.error || "PDF extraction failed");
                    }
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            } catch (error) {
                console.error("PDF extraction error:", error);
                throw new Error("Could not extract text from PDF. Please copy the text from your PDF and paste it in the text area below.");
            }
        },

        async _extractWordText(file) {
            // Use the new backend service for Word document extraction
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/extract-text', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.extractedText) {
                        return result.extractedText;
                    } else {
                        throw new Error(result.error || "Word extraction failed");
                    }
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            } catch (error) {
                console.error("Word extraction error:", error);
                throw new Error("Could not extract text from Word document. Please copy the text from your document and paste it in the text area below.");
            }
        },

        async onAnalyzeDocument() {
            const oModel = this.getView().getModel("aiModel");
            const documentText = oModel.getProperty("/documentText");

            if (!documentText || documentText.trim().length === 0) {
                MessageToast.show("Please enter document text first");
                return;
            }

            oModel.setProperty("/isProcessing", true);
            oModel.setProperty("/processingMessage", "Analyzing document with Gemini AI...");

            try {
                const analysis = await this._callGeminiAPI(documentText, "analyze");

                oModel.setProperty("/analysisResult", analysis);
                oModel.setProperty("/hasAnalysis", true);
                oModel.setProperty("/isProcessing", false);
                oModel.setProperty("/analysisTimestamp", new Date());

                // Save to data service for dashboard/analytics integration
                this._saveAnalysisToDataService(documentText, analysis, oModel);

                MessageToast.show("Document analysis completed!");

            } catch (error) {
                oModel.setProperty("/isProcessing", false);
                MessageBox.error("Analysis failed: " + error.message);
            }
        },

        async onAskQuestion() {
            const oModel = this.getView().getModel("aiModel");
            const question = oModel.getProperty("/currentQuestion");
            const documentText = oModel.getProperty("/documentText");

            if (!question || question.trim().length === 0) {
                MessageToast.show("Please enter a question");
                return;
            }

            if (!documentText || documentText.trim().length === 0) {
                MessageToast.show("Please load a document first");
                return;
            }

            oModel.setProperty("/isProcessing", true);
            oModel.setProperty("/processingMessage", "Getting answer from Gemini AI...");

            try {
                const answer = await this._callGeminiAPI(documentText, "question", question);

                const qaResults = oModel.getProperty("/qaResults") || [];
                qaResults.unshift({
                    question: question,
                    answer: answer
                });

                oModel.setProperty("/qaResults", qaResults);
                oModel.setProperty("/hasQAResults", true);
                oModel.setProperty("/currentQuestion", "");
                oModel.setProperty("/isProcessing", false);

                MessageToast.show("Question answered!");

            } catch (error) {
                oModel.setProperty("/isProcessing", false);
                MessageBox.error("Question failed: " + error.message);
            }
        },

        onClearQuestion() {
            const oModel = this.getView().getModel("aiModel");
            oModel.setProperty("/currentQuestion", "");
        },

        async _callGeminiAPI(documentText, type, question = null) {
            // Use the backend service for AI analysis to avoid CORS issues
            try {
                let endpoint, requestData;

                if (type === "analyze") {
                    endpoint = '/legal-documents/analyzeDocument';
                    requestData = {
                        documentText: documentText,
                        analysisType: 'comprehensive'
                    };
                } else if (type === "question") {
                    endpoint = '/legal-documents/askQuestion';
                    requestData = {
                        question: question,
                        documentText: documentText
                    };
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    if (type === "analyze") {
                        return data.analysis?.content || data.analysis || "Analysis completed successfully";
                    } else if (type === "question") {
                        return data.response || data.answer || "Answer received successfully";
                    }
                } else {
                    throw new Error(data.error || "AI service returned an error");
                }

            } catch (error) {
                console.error("Backend AI call failed, trying direct API:", error);

                // Fallback to direct Gemini API call
                const GEMINI_API_KEY = "AIzaSyCD2oTOCeV_JJtFd_ZTTYyGz1zNKjtUK2Q";
                const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

                let prompt;
                if (type === "analyze") {
                    prompt = `Analyze this legal document and provide a comprehensive analysis including:
1. Document type
2. Key parties involved
3. Main terms and conditions
4. Financial details
5. Important dates and deadlines
6. Potential risks or concerns
7. Summary of key obligations

Document:
${documentText}`;
                } else if (type === "question") {
                    prompt = `Based on this legal document, please answer the following question:

Question: ${question}

Document:
${documentText}

Please provide a detailed answer based only on the information in the document.`;
                }

                const requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                };

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`Direct API call failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("No response from Gemini AI");
                }
            }
        },

        onDownloadSimplifiedForm() {
            const oModel = this.getView().getModel("aiModel");
            const analysisResult = oModel.getProperty("/analysisResult");
            const documentText = oModel.getProperty("/documentText");
            const documentTitle = oModel.getProperty("/originalDocumentTitle") || "Legal Document";
            const timestamp = oModel.getProperty("/analysisTimestamp") || new Date();

            if (!analysisResult) {
                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("noAnalysisAvailable"));
                return;
            }

            try {
                const simplifiedForm = this._generateSimplifiedForm(analysisResult, documentText, documentTitle, timestamp);
                const filename = `simplified-${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                this._downloadFile(simplifiedForm, filename, "text/plain");

                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("simplifiedFormDownloaded"));
            } catch (error) {
                MessageBox.error("Failed to generate simplified form: " + error.message);
            }
        },

        onDownloadFullAnalysis() {
            const oModel = this.getView().getModel("aiModel");
            const analysisResult = oModel.getProperty("/analysisResult");
            const documentText = oModel.getProperty("/documentText");
            const documentTitle = oModel.getProperty("/originalDocumentTitle") || "Legal Document";
            const timestamp = oModel.getProperty("/analysisTimestamp") || new Date();

            if (!analysisResult) {
                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("noAnalysisAvailable"));
                return;
            }

            try {
                const fullAnalysis = this._generateFullAnalysisReport(analysisResult, documentText, documentTitle, timestamp);
                const filename = `full-analysis-${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                this._downloadFile(fullAnalysis, filename, "text/plain");

                const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("fullAnalysisDownloaded"));
            } catch (error) {
                MessageBox.error("Failed to generate full analysis: " + error.message);
            }
        },

        _generateSimplifiedForm(analysisResult, originalText, documentTitle, timestamp) {
            // Extract key information from the analysis to create a simplified form
            const simplifiedContent = `
SIMPLIFIED LEGAL DOCUMENT SUMMARY
================================

Document Title: ${documentTitle}
Generated on: ${timestamp.toLocaleDateString()} at ${timestamp.toLocaleTimeString()}
Generated by: Legal Document Analyzer AI

DOCUMENT OVERVIEW
-----------------
Document Name: ${documentTitle}
Original Document Length: ${originalText.length} characters
Analysis Date: ${timestamp.toLocaleDateString()}

KEY POINTS SUMMARY
------------------
${this._extractKeyPoints(analysisResult)}

MAIN PARTIES
------------
${this._extractParties(analysisResult)}

IMPORTANT TERMS & CONDITIONS
-----------------------------
${this._extractTermsAndConditions(analysisResult)}

OBLIGATIONS & RESPONSIBILITIES
------------------------------
${this._extractObligations(analysisResult)}

DATES & DEADLINES
-----------------
${this._extractDatesAndDeadlines(analysisResult)}

FINANCIAL TERMS
---------------
${this._extractFinancialTerms(analysisResult)}

RISKS & CONSIDERATIONS
----------------------
${this._extractRisks(analysisResult)}

RECOMMENDATIONS
---------------
${this._extractRecommendations(analysisResult)}

---
This simplified form is generated by AI and should be reviewed by a legal professional.
For the complete analysis, please refer to the full analysis document.
            `.trim();

            return simplifiedContent;
        },

        _generateFullAnalysisReport(analysisResult, originalText, documentTitle, timestamp) {
            const fullReport = `
COMPREHENSIVE LEGAL DOCUMENT ANALYSIS REPORT
============================================

Document Title: ${documentTitle}
Generated on: ${timestamp.toLocaleDateString()} at ${timestamp.toLocaleTimeString()}
Generated by: Legal Document Analyzer AI (Gemini)

DOCUMENT INFORMATION
--------------------
Document Name: ${documentTitle}
Analysis Date: ${timestamp.toLocaleDateString()}
Original Document Length: ${originalText.length} characters
Analysis Type: Comprehensive AI Analysis

FULL AI ANALYSIS
----------------
${analysisResult}

ORIGINAL DOCUMENT TEXT
----------------------
${originalText}

TECHNICAL DETAILS
-----------------
AI Model: Gemini AI
Processing Time: Real-time analysis
Confidence Level: High (AI-generated analysis)
Analysis Method: Natural Language Processing with Legal Domain Knowledge

DISCLAIMER
----------
This analysis is generated by artificial intelligence and is intended for informational
purposes only. It should not be considered as legal advice. Please consult with a
qualified legal professional for official legal guidance and interpretation.

---
Report generated by Legal Document Analyzer
Powered by Gemini AI
            `.trim();

            return fullReport;
        },

        _extractKeyPoints(analysisText) {
            // Simple extraction logic - look for bullet points, numbered lists, or key phrases
            const lines = analysisText.split('\n');
            const keyPoints = [];

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.match(/^[\d\-\*•]/) ||
                    trimmedLine.toLowerCase().includes('key') ||
                    trimmedLine.toLowerCase().includes('important') ||
                    trimmedLine.toLowerCase().includes('main')) {
                    keyPoints.push(trimmedLine);
                }
            }

            return keyPoints.length > 0 ? keyPoints.join('\n') : 'Key points extracted from AI analysis (see full analysis for details)';
        },

        _extractParties(analysisText) {
            // Look for party-related information
            const partyKeywords = ['party', 'parties', 'client', 'contractor', 'vendor', 'company', 'organization'];
            const lines = analysisText.split('\n');
            const partyInfo = [];

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                if (partyKeywords.some(keyword => lowerLine.includes(keyword))) {
                    partyInfo.push(line.trim());
                }
            }

            return partyInfo.length > 0 ? partyInfo.slice(0, 5).join('\n') : 'Parties information available in full analysis';
        },

        _extractTermsAndConditions(analysisText) {
            // Look for terms and conditions
            const termKeywords = ['term', 'condition', 'clause', 'provision', 'requirement'];
            return this._extractByKeywords(analysisText, termKeywords, 'Terms and conditions detailed in full analysis');
        },

        _extractObligations(analysisText) {
            // Look for obligations and responsibilities
            const obligationKeywords = ['obligation', 'responsibility', 'duty', 'must', 'shall', 'required'];
            return this._extractByKeywords(analysisText, obligationKeywords, 'Obligations detailed in full analysis');
        },

        _extractDatesAndDeadlines(analysisText) {
            // Look for dates and deadlines
            const dateKeywords = ['date', 'deadline', 'due', 'expire', 'term', 'period'];
            return this._extractByKeywords(analysisText, dateKeywords, 'Dates and deadlines detailed in full analysis');
        },

        _extractFinancialTerms(analysisText) {
            // Look for financial information
            const financialKeywords = ['payment', 'fee', 'cost', 'price', 'amount', 'money', 'financial', 'compensation'];
            return this._extractByKeywords(analysisText, financialKeywords, 'Financial terms detailed in full analysis');
        },

        _extractRisks(analysisText) {
            // Look for risks and warnings
            const riskKeywords = ['risk', 'warning', 'caution', 'liability', 'penalty', 'breach'];
            return this._extractByKeywords(analysisText, riskKeywords, 'Risk assessment available in full analysis');
        },

        _extractRecommendations(analysisText) {
            // Look for recommendations
            const recommendationKeywords = ['recommend', 'suggest', 'advice', 'should', 'consider'];
            return this._extractByKeywords(analysisText, recommendationKeywords, 'Recommendations available in full analysis');
        },

        _extractByKeywords(analysisText, keywords, fallbackText) {
            const lines = analysisText.split('\n');
            const relevantLines = [];

            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                if (keywords.some(keyword => lowerLine.includes(keyword))) {
                    relevantLines.push(line.trim());
                }
            }

            return relevantLines.length > 0 ? relevantLines.slice(0, 3).join('\n') : fallbackText;
        },

        _downloadFile(content, filename, mimeType) {
            // Create blob and download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);

            // Create temporary download link
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        _saveAnalysisToDataService(documentText, analysis, oModel) {
            if (!this._dataService) return;

            try {
                const documentTitle = oModel.getProperty("/originalDocumentTitle") || "Analyzed Document";
                const timestamp = new Date();

                // Create document data
                const documentData = {
                    title: documentTitle,
                    fileName: documentTitle.includes('.') ? documentTitle : documentTitle + '.txt',
                    content: documentText,
                    analysis: analysis,
                    confidence: 0.95, // Default confidence
                    processingTime: 2.3, // Default processing time
                    timestamp: timestamp.toISOString()
                };

                // Add to data service
                const savedDocument = this._dataService.addDocument(documentData);

                console.log("Document saved to data service:", savedDocument.ID);

                // Update analytics query count
                const analytics = this._dataService.getAnalytics();
                analytics.totalQueries = (analytics.totalQueries || 0) + 1;

            } catch (error) {
                console.warn("Failed to save analysis to data service:", error);
            }
        }

    });
});