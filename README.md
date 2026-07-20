# DDRiVE-M

**DDRiVE-M (Data-Driven Resilience Management)** is an intelligence cycle system developed by **ASilva Innovations** to help organizations anticipate, adapt, and respond to disruption in real time.  
It integrates **AI-driven monitoring, compliance frameworks, and resilience analytics** into a unified platform.

---

## 🌐 Live Demo

- [DDRiVE-M](https://asilvainnovations.com/ddrive-m)  
- [DDRiVE-M Intelligence Platform](https://asilvainnovations.com/ddrive-m-dashboard)  

---
## Project Structure

ddrive-m/
|── .githhub/workflows
│   ├── generator-generic-ossf-slsa3-publish.yml
|── public/
│   ├── EOCSimulation.html/
│   ├── PSCP-Digital-Template.html
│   ├── Safeguard-FPIC-Tracker.html
│   ├── EOCSimulation.html
│   ├──gawad-kalasag.html
│   ├──gawad-kalasag.json 
│   ├──gk-simulation.html 
│   ├──gk.js 
│   ├──ics-simulator-3.0.html
│   ├──ics.html
│   ├──index.html 
│   ├──platform.html 
│   ├──pricing.html
│   ├──pscp.html 
│   ├──security-assessment.html 
│   ├──sparc.html 
│   ├──understanding-ics.html 
│   ├──user-manual.html
│   ├──about.html 
│   ├──ddriver-ai.html 
│   ├──eoc.html 
│   ├──faq.html
|── src/
│   ├──App.css 
│   ├──App.tsx
│   ├──index.css 
│   ├──main.tsx
│   ├── components
│    │   │   └── AppLayout.tsx      
│    │   │   └── theme-provider.tsx
│    │   │   └── ddrive      
│    │   |   |   |── dashboardModule  
│    │   |   |   |  |── Dashboard.tsx
│    │   |   |   |   |── KPICard.tsx	 
│    │   |   |   |   |──RiskHeatMap.tsx 
│    │   |   |   |   |──RiskStats.tsx
│    │   |   |   |   |──StatCard.tsx
│    │   |   |   |── detectionModule  
│    │   |    |       |      |── Detecttion.tsx
│    │   |    |       |      |── GeoRiskPanel.tsx
│    │   |    |       |      |── RiskMatrix.tsx
│    │   |    |       |      |── RiskToolbar.tsx
│    │   |    |       |── diagnosisModule  
│    │   |    |       |      |── AddRiskModal.tsx
│    │   |    |       |      |── Diagnosis.tsx 
│    │   |    |       |      |── RiskAssessment.tsx 
│    │   |    |       |      |── RiskDetailModal.tsx
│    │   |    |       |── documentsModule  
│    │   |    |       |      |── Documents.tsx 
│    │   |    |       |      |── PlanGenerator.tsx 
│    │   |    |       |      |── PlanLibrary.tsx
│    │   |    |       |── enhancementModule  
│    │   |    |       |      |──COSOFramework.tsx 
│    │   |    |       |      |──Compliance.tsx 
│    │   |    |       |      |──Enhancement.tsx
│    │   |    |       |── monitoringModule
│    │   |    |       |      |──Collaboration.tsx 
│    │   |    |       |      |──Monitoring.tsx
│    │   |    |       |── responseModule
│    │   |    |       |      |──Response.tsx
│    │   |    |       |── AIChatbot.tsx 
│    │   |    |       |── DDriveLogo.tsx 
│    │   |    |       |── IntegrationModule.tsx 
│    │   |    |       |── LoginModal.tsx 
│    │   |    |       |── SettingsModule.tsx 
│    │   |    |       |── Sidebar.tsx 
│    │   |    |       |── TopBar.tsx 
│    │   |    |       |── ValidationModule.tsx
│    │   |   └── ui          
│    │   |    |       |── GlassCard.tsx	 
│    │   |    |       |── accordion.tsx 
│    │   |    |       |── alert-dialog.tsx 
│    │   |    |       |── alert.tsx 
│    │   |    |       |── aspect-ratio.tsx 
│    │   |    |       |── avatar.tsx 
│    │   |    |       |── badge.tsx 
│    │   |    |       |── breadcrumb.tsx 
│    │   |    |       |── button.tsx
│    │   |    |       |── calendar.tsx 
│    │   |    |       |── card.tsx 
│    │   |    |       |── carousel.tsx 
│    │   |    |       |── chart.tsx 
│    │   |    |       |── checkbox.tsx 
│    │   |    |       |── collapsible.tsx 
│    │   |    |       |── command.tsx 
│    │   |    |       |── context-menu.tsx 
│    │   |    |       |── dialog.tsx 
│    │   |    |       |── drawer.tsx 
│    │   |    |       |── dropdown-menu.tsx 
│    │   |    |       |── form.tsx 
│    │   |    |       |── hover-card.tsx	 
│    │   |    |       |── icons.tsx 
│    │   |    |       |── input-otp.tsx 
│    │   |    |       |── input.tsx 
│    │   |    |       |── label.tsx 
│    │   |    |       |── menubar.tsx 
│    │   |    |       |── navigation-menu.tsx 
│    │   |    |       |── pagination.tsx 
│    │   |    |       |── popover.tsx 
│    │   |    |       |── progress.tsx 
│    │   |    |       |── radio-group.tsx 
│    │   |    |       |── resizable.tsx 
│    │   |    |       |── scroll-area.tsx 
│    │   |    |       |── select.tsx 
│    │   |    |       |── separator.tsx 
│    │   |    |       |── sheet.tsx 
│    │   |    |       |── sidebar.tsx 
│    │   |    |       |── skeleton.tsx 
│    │   |    |       |── slider.tsx 
│    │   |    |       |── sonner.tsx
│    │   |    |       |── switch.tsx 
│    │   |    |       |── table.tsx 
│    │   |    |       |── tabs.tsx 
│    │   |    |       |── textarea.tsx 
│    │   |    |       |── toast.tsx
│    │   |    |       |── toaster.tsx 
│    │   |    |       |── toggle-group.tsx 
│    │   |    |       |── toggle.tsx
│    │   |    |       |── tooltip.tsx
│    │   |    |     |── use-toast.ts
│    | ── contexts/
│    |     └── AppContext.tsx           
│    |     └── AuthContext.tsx
│    | ── hooks 
│    |     └── use-mobile.tsx 
│    |     └── use-toast.ts 
│    |     └── useRisks.ts
│    | ── lib 
│    |     └── risk.ts
│    |     └── supabase.ts
│    |     └── utils.ts
│    | ── pages 
│    |     └── Index.tsx 
│    |     └── NotFound.tsx                   
|──.gitignore 
|──LICENSE
|──components.json 
|──eslint.config.js 
|──index.html
|──package-lock.json
|──package.json
|──postcss.config.js
|──robots.txt 
|──tailwind.config.ts
|──tsconfig.app.json
|──tsconfig.json 
|──tsconfig.node.json 
|──vite.config.ts
|──README.md

## 📖 Overview

Organizations across Asia and beyond face escalating volatility from supply chain disruptions, regulatory shifts, and climate risks.  
**DDRiVE-M provides a structured intelligence cycle** to strengthen decision-making and adaptive resilience:

1. **Detection** – Identify emerging risks through live monitoring and AI alerts.  
2. **Diagnosis** – Analyze vulnerabilities and root causes using structured data.  
3. **Response** – Deploy rapid mitigation strategies aligned with resilience goals.  
4. **Integration** – Embed resilience actions into organizational workflows.  
5. **Validation** – Test decisions against compliance and resilience criteria.  
6. **Enhancement** – Improve systems continuously through lessons learned.  
7. **Monitoring** – Track performance indicators and feedback loops in real time.  

---

## 🚀 Features

- **Risk Heatmaps** – Visualize vulnerabilities across supply chain, finance, and workforce.  
- **Resilience Scoring** – Quantify organizational readiness and adaptability.  
- **Decision Support Tools** – Structured matrices for option validation.  
- **Compliance Alignment** – Built-in checks against RA 10121, ISO 31000, ISO 22301, UNDRR, and DILG standards.  
- **Continuous Monitoring** – Real-time updates on resilience indicators.  

---

## 🏢 Use Cases

- **SMEs** – Improve decision speed and resilience under uncertainty.  
- **Enterprises** – Integrate resilience into governance and compliance frameworks.  
- **Government & NGOs** – Align with disaster risk reduction and management standards.  
- **Consultants** – Apply structured methodologies in client engagements.  

---

## 📂 Repository Structure

- `index.html` – Landing page for DDRiVE-M.  
- `README.md` – Documentation (this file).  
- `.gitignore` – Git configuration.  
- `LICENSE` – MIT License.  

---

## 📖 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome!  
1. Fork the repository  
2. Create a feature branch (`git checkout -b feature-name`)  
3. Commit changes (`git commit -m "Add feature"`)  
4. Push to branch (`git push origin feature-name`)  
5. Open a Pull Request  

---

## 📬 Contact

**ASilva Innovations**  
Muntinlupa City, Metro Manila, Philippines  

- Website: [asilvainnovations.com](https://asilvainnovations.com)  
- DDRiVE-M Platform: [ddrive-m](https://asilvainnovations.com/ddrive-m/)  

---
