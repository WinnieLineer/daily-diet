# Google OAuth Review Guide for Daily Diet

This document contains the justifications and checklists required for Google's OAuth Verification process, specifically for the `generative-language` and `drive.appdata` scopes.

## 1. Justification for Scopes (English - Recommended for Submission)

**Description for the OAuth Consent Screen:**
The "Daily Diet" application is a nutrition tracking tool that uses AI to help users log meals. We require the generative-language scopes to enable core features:

1. **Image Recognition & Analysis:** Users upload food photos which are processed via the Gemini API to identify food items and estimate nutritional values.
2. **Content Retrieval & Tuning:** These scopes allow users to maintain a personalized food database (retriever) and use specific AI parameters for more accurate local food recognition (e.g., specific regional dishes).
3. **Data Privacy & Quota:** By using these scopes, users can leverage their own API quota for privacy and personalized results. A more limited scope would not allow the app to perform the complex semantic search and custom model tuning required to accurately analyze diverse food types.

---

## 2. Detailed Scope Breakdown

### `generative-language.retriever`
**Justification:** This scope is used to create and manage the user's personal food knowledge base. It allows the AI to provide more accurate retrieval results based on the user's past eating habits and frequently consumed local dishes that might not be in standard global datasets.

### `generative-language.tuning`
**Justification:** Dietary cultures vary significantly by region. The application needs this scope to fine-tune models to correctly identify local specialties (e.g., specific Taiwanese night market foods). Standard pre-trained models often lack the precision required for these unique items.

---

## 3. Demo Video (YouTube) Checklist
**Video URL:** https://youtu.be/Cmil5l3iN7s

Ensure the video demonstrates the following clearly:
- [ ] **OAuth Consent Screen:** Show the user clicking "Login" and the subsequent Google authorization screen displaying the App Name.
- [ ] **Client ID Visibility:** Ensure the Client ID is visible in the URL bar or on the consent screen during the process.
- [ ] **Feature Demonstration:**
    - [ ] Show a photo being uploaded/taken.
    - [ ] Show the AI analysis process starting.
    - [ ] Show the analysis results being displayed and saved to the user's log.
- [ ] **Voiceover/Captions:** Use English captions or audio to explain which scope is being utilized during each action.

---

## 4. How to Submit
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > OAuth consent screen**.
3. Click **Edit App**.
4. In the **Scopes** section, update the justification for each requested sensitive/restricted scope using the text provided above.
5. Ensure the YouTube video is set to **"Unlisted"** or **"Public"**.
6. Submit for verification.
