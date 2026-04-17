import React from 'react';

const ScoringRules = () => {
  const rules = [
    { event: "Kill", points: "+1" },
    { event: "Death", points: "-0.5" },
    { event: "Assist", points: "+0.5" },
    { event: "Clutch (1vX)", points: "+2" },
    { event: "ACE", points: "+5" },
  ];

  return (
    <div className="container">
      <h1>VCT Fantasy Scoring Rules</h1>
      <p>Points are calculated based on official VCT match data:</p>
      <div className="mt-8 overflow-hidden rounded-lg border border-gray-700">
        <table className="min-w-full divide-y divide-gray-700 bg-gray-900 text-left text-sm text-gray-300">
            <thead className="bg-gray-800 text-xs uppercase text-gray-400">
                <tr>
                    <th className="px-6 py-3 font-semibold">Action</th>
                    <th className="px-6 py-3 font-semibold">Points</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {rules.map((rule, index) => (
                    <tr key={index} className="hover:bg-gray-800/50">
                        <td className="whitespace-nowrap px-6 py-4">{rule.event}</td>
                        <td className="whitespace-nowrap px-6 py-4 font-bold text-red-500">{rule.points}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>
  );
};

export default ScoringRules;