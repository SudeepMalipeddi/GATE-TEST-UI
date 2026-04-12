import type { ExamData } from '../types/exam'

export const sampleExam: ExamData = {
  name: 'GATE CSE 2024 — Mock Test',
  durationMinutes: 180,
  candidateName: 'Sudeep Kumar',
  candidateId: 'GATE2024001',
  sections: [
    {
      name: 'General Aptitude',
      questions: [
        {
          id: 'ga_1',
          type: 'MCQ',
          text: '<p>Choose the option that best fills the blank:<br/><br/><em>"The committee _____ its decision after reviewing the new evidence."</em></p>',
          options: [
            { id: 'A', text: 'reversed' },
            { id: 'B', text: 'reverses' },
            { id: 'C', text: 'reversing' },
            { id: 'D', text: 'has reversed' },
          ],
          correctAnswer: 'A',
          marks: 1,
          penalty: 0.33,
        },
        {
          id: 'ga_2',
          type: 'MCQ',
          text: '<p>A train travels 60 km/h for the first half of the distance and 40 km/h for the second half. What is the average speed for the entire journey?</p>',
          options: [
            { id: 'A', text: '48 km/h' },
            { id: 'B', text: '50 km/h' },
            { id: 'C', text: '52 km/h' },
            { id: 'D', text: '45 km/h' },
          ],
          correctAnswer: 'A',
          marks: 1,
          penalty: 0.33,
        },
        {
          id: 'ga_3',
          type: 'NAT',
          text: '<p>The sum of first <em>n</em> natural numbers is 210. Find the value of <em>n</em>.</p>',
          options: [],
          correctAnswer: '20',
          marks: 2,
          penalty: 0,
        },
        {
          id: 'ga_4',
          type: 'MSQ',
          text: '<p>Which of the following are prime numbers?</p>',
          options: [
            { id: 'A', text: '2' },
            { id: 'B', text: '9' },
            { id: 'C', text: '13' },
            { id: 'D', text: '25' },
            { id: 'E', text: '37' },
          ],
          correctAnswer: ['A', 'C', 'E'],
          marks: 2,
          penalty: 0,
        },
        {
          id: 'ga_5',
          type: 'MCQ',
          text: '<p>If LOGIC is coded as MORJD, then BRAIN is coded as:</p>',
          options: [
            { id: 'A', text: 'CSBJO' },
            { id: 'B', text: 'CSBIO' },
            { id: 'C', text: 'DTCKP' },
            { id: 'D', text: 'CSAJO' },
          ],
          correctAnswer: 'A',
          marks: 1,
          penalty: 0.33,
        },
      ],
    },
    {
      name: 'Technical — CS',
      questions: [
        {
          id: 'cs_1',
          type: 'MCQ',
          text: '<p>Which of the following sorting algorithms has the best average-case time complexity?</p>',
          options: [
            { id: 'A', text: 'Bubble Sort — O(n²)' },
            { id: 'B', text: 'Merge Sort — O(n log n)' },
            { id: 'C', text: 'Insertion Sort — O(n²)' },
            { id: 'D', text: 'Selection Sort — O(n²)' },
          ],
          correctAnswer: 'B',
          marks: 1,
          penalty: 0.33,
        },
        {
          id: 'cs_2',
          type: 'MCQ',
          text: `<p>Consider the following C program:</p>
<pre style="background:#f4f4f4;padding:8px;border-radius:4px;font-size:13px">
#include &lt;stdio.h&gt;
int main() {
    int x = 5;
    printf("%d %d %d", x++, x, ++x);
    return 0;
}</pre>
<p>What is the output? (Assume left-to-right evaluation)</p>`,
          options: [
            { id: 'A', text: '5 6 7' },
            { id: 'B', text: '6 6 7' },
            { id: 'C', text: '7 7 7' },
            { id: 'D', text: 'Undefined behavior' },
          ],
          correctAnswer: 'D',
          marks: 2,
          penalty: 0.67,
        },
        {
          id: 'cs_3',
          type: 'NAT',
          text: '<p>A binary tree has 10 nodes. What is the maximum possible height of this tree?</p>',
          options: [],
          correctAnswer: '9',
          marks: 2,
          penalty: 0,
        },
        {
          id: 'cs_4',
          type: 'MSQ',
          text: '<p>Which of the following are properties of a relational database?</p>',
          options: [
            { id: 'A', text: 'Each table has a primary key' },
            { id: 'B', text: 'Data is stored in a hierarchical structure' },
            { id: 'C', text: 'Relationships are expressed using foreign keys' },
            { id: 'D', text: 'SQL is used to query data' },
            { id: 'E', text: 'Tables are ordered by insertion time' },
          ],
          correctAnswer: ['A', 'C', 'D'],
          marks: 2,
          penalty: 0,
        },
        {
          id: 'cs_5',
          type: 'MCQ',
          text: '<p>In TCP/IP, which layer is responsible for end-to-end delivery and error correction?</p>',
          options: [
            { id: 'A', text: 'Network Layer' },
            { id: 'B', text: 'Data Link Layer' },
            { id: 'C', text: 'Transport Layer' },
            { id: 'D', text: 'Application Layer' },
          ],
          correctAnswer: 'C',
          marks: 1,
          penalty: 0.33,
        },
        {
          id: 'cs_6',
          type: 'MCQ',
          text: '<p>Which page replacement algorithm suffers from Bélády\'s anomaly?</p>',
          options: [
            { id: 'A', text: 'Optimal' },
            { id: 'B', text: 'LRU' },
            { id: 'C', text: 'FIFO' },
            { id: 'D', text: 'LFU' },
          ],
          correctAnswer: 'C',
          marks: 1,
          penalty: 0.33,
        },
        {
          id: 'cs_7',
          type: 'NAT',
          text: '<p>How many minimum number of flip-flops are required to design a mod-12 counter?</p>',
          options: [],
          correctAnswer: '4',
          marks: 2,
          penalty: 0,
        },
        {
          id: 'cs_8',
          type: 'MCQ',
          text: '<p>The time complexity of Dijkstra\'s algorithm using a min-heap is:</p>',
          options: [
            { id: 'A', text: 'O(V²)' },
            { id: 'B', text: 'O(E log V)' },
            { id: 'C', text: 'O(V log E)' },
            { id: 'D', text: 'O(E + V log V)' },
          ],
          correctAnswer: 'D',
          marks: 2,
          penalty: 0.67,
        },
      ],
    },
  ],
}
