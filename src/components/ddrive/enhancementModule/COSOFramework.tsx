import React from 'react';
import { CheckCircle } from 'lucide-react';

const COSOFramework: React.FC = () => {
  const components = [
    {
      name: 'Governance & Culture',
      principles: [
        'Exercises Board Risk Oversight',
        'Establishes Operating Structures',
        'Defines Desired Culture',
        'Demonstrates Commitment to Core Values',
        'Attracts, Develops, and Retains Capable Individuals',
      ],
      color: 'bg-blue-600',
    },
    {
      name: 'Strategy & Objective-Setting',
      principles: [
        'Analyzes Business Context',
        'Defines Risk Appetite',
        'Evaluates Alternative Strategies',
        'Formulates Business Objectives',
      ],
      color: 'bg-purple-600',
    },
    {
      name: 'Performance',
      principles: [
        'Identifies Risk',
        'Assesses Severity of Risk',
        'Prioritizes Risks',
        'Implements Risk Responses',
        'Develops Portfolio View',
      ],
      color: 'bg-green-600',
    },
    {
      name: 'Review & Revision',
      principles: [
        'Assesses Substantial Change',
        'Reviews Risk and Performance',
        'Pursues Improvement in ERM',
      ],
      color: 'bg-orange-600',
    },
    {
      name: 'Information, Communication & Reporting',
      principles: [
        'Leverages Information Systems',
        'Communicates Risk Information',
        'Reports on Risk, Culture, and Performance',
      ],
      color: 'bg-red-600',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold mb-4">COSO ERM Framework 2017</h3>
      <p className="text-sm text-gray-600 mb-6">Five Components & Twenty Principles</p>
      
      <div className="space-y-4">
        {components.map((component, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className={`${component.color} text-white p-4`}>
              <h4 className="font-semibold">{idx + 1}. {component.name}</h4>
            </div>
            <div className="p-4 bg-gray-50">
              <ul className="space-y-2">
                {component.principles.map((principle, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2 text-sm">
                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{principle}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default COSOFramework;
