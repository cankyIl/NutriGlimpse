import unittest
from evaluate_proposals import evaluate
class ProposalEvaluationTests(unittest.TestCase):
    def test_duplicate_and_missing_are_counted(self):
        r=evaluate([[0,0,10,10],[20,0,30,10]],[[0,0,10,10],[0,0,10,10]])
        self.assertEqual((r['truePositives'],r['falsePositives'],r['falseNegatives'],r['duplicatePredictions']),(1,1,1,1))
    def test_one_merged_box_cannot_match_two_packages(self):
        r=evaluate([[0,0,10,10],[10,0,20,10]],[[0,0,20,10]])
        self.assertEqual((r['truePositives'],r['falseNegatives'],len(r['suspectedMerges'])),(1,1,1))
    def test_explicit_ignored_region_does_not_hide_true_match(self):
        r=evaluate([[0,0,10,10]],[[0,0,10,10],[20,0,30,10],[40,0,50,10]],[[0,0,10,10],[20,0,30,10]])
        self.assertEqual((r['truePositives'],r['falsePositives'],r['ignoredPredictions']),(1,1,1))
    def test_maximum_matching_resolves_competing_predictions(self):
        r=evaluate([[0,0,10,10],[5,0,15,10]],[[0,0,15,10],[0,0,10,10]])
        self.assertEqual(r['truePositives'],2)
    def test_empty_predictions_are_zero_recall(self):
        r=evaluate([[0,0,10,10]],[])
        self.assertEqual((r['recall'],r['falseNegatives']),(0,1))
if __name__=='__main__': unittest.main()
