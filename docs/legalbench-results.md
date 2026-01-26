# LegalBench Evaluation

## Predictions JSONL format

One JSON object per line:

```json
{"task":"abercrombie","split":"test","id":0,"prediction":"Yes","meta":{"model":"gpt-4.1-mini"}}
```

Required fields:
- `task`: task directory name under `data/legalbench/tasks/`
- `split`: use `"test"`
- `id`: row index (0-based) in `test.tsv`
- `prediction`: string output

Optional fields:
- `meta`: any metadata (model, temperature, prompt version)
- `input`: saved raw row fields for debugging

## Results

No runs yet. Generate a predictions file, then run:

`data/legalbench/.venv/bin/python scripts/legalbench-eval.py --predictions /path/to/predictions.jsonl --report docs/legalbench-results.md --run-name "my-run"`

By default, the evaluator scores only tasks present in the predictions file. To force scoring every task (treating missing predictions as empty strings), add `--all-tasks`.


### Run 2026-01-26 09:07:55Z — empty-baseline

- Predictions: `/tmp/legalbench_preds_empty.jsonl`
- Tasks: `162`
- Weighted coverage: `0.0000`
- Macro avg (scored tasks): `0.0000`
- Weighted avg (scored tasks): `0.0001`

| task | n_test | n_pred | coverage | score | note |
|---|---:|---:|---:|---:|---|
| abercrombie | 95 | 0 | 0.000 | 0.0000 |  |
| canada_tax_court_outcomes | 244 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_classification | 108 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_open | 53 | 0 | 0.000 | 0.0000 |  |
| consumer_contracts_qa | 396 | 0 | 0.000 | 0.0000 |  |
| contract_nli_confidentiality_of_agreement | 82 | 0 | 0.000 | 0.0000 |  |
| contract_nli_explicit_identification | 109 | 0 | 0.000 | 0.0000 |  |
| contract_nli_inclusion_of_verbally_conveyed_information | 139 | 0 | 0.000 | 0.0000 |  |
| contract_nli_limited_use | 208 | 0 | 0.000 | 0.0000 |  |
| contract_nli_no_licensing | 162 | 0 | 0.000 | 0.0000 |  |
| contract_nli_notice_on_compelled_disclosure | 142 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_acquirement_of_similar_information | 178 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_copy | 87 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_development_of_similar_information | 136 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_post-agreement_possession | 111 | 0 | 0.000 | 0.0000 |  |
| contract_nli_return_of_confidential_information | 66 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_employees | 170 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_third-parties | 180 | 0 | 0.000 | 0.0000 |  |
| contract_nli_survival_of_obligations | 157 | 0 | 0.000 | 0.0000 |  |
| contract_qa | 80 | 0 | 0.000 | 0.0000 |  |
| corporate_lobbying | 490 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensee | 198 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensor | 88 | 0 | 0.000 | 0.0000 |  |
| cuad_anti-assignment | 1172 | 0 | 0.000 | 0.0000 |  |
| cuad_audit_rights | 1216 | 0 | 0.000 | 0.0000 |  |
| cuad_cap_on_liability | 1246 | 0 | 0.000 | 0.0000 |  |
| cuad_change_of_control | 416 | 0 | 0.000 | 0.0000 |  |
| cuad_competitive_restriction_exception | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_covenant_not_to_sue | 308 | 0 | 0.000 | 0.0000 |  |
| cuad_effective_date | 236 | 0 | 0.000 | 0.0000 |  |
| cuad_exclusivity | 762 | 0 | 0.000 | 0.0000 |  |
| cuad_expiration_date | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_governing_law | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_insurance | 1030 | 0 | 0.000 | 0.0000 |  |
| cuad_ip_ownership_assignment | 576 | 0 | 0.000 | 0.0000 |  |
| cuad_irrevocable_or_perpetual_license | 280 | 0 | 0.000 | 0.0000 |  |
| cuad_joint_ip_ownership | 192 | 0 | 0.000 | 0.0000 |  |
| cuad_license_grant | 1396 | 0 | 0.000 | 0.0000 |  |
| cuad_liquidated_damages | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_minimum_commitment | 772 | 0 | 0.000 | 0.0000 |  |
| cuad_most_favored_nation | 64 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_customers | 84 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_employees | 142 | 0 | 0.000 | 0.0000 |  |
| cuad_non-compete | 442 | 0 | 0.000 | 0.0000 |  |
| cuad_non-disparagement | 100 | 0 | 0.000 | 0.0000 |  |
| cuad_non-transferable_license | 542 | 0 | 0.000 | 0.0000 |  |
| cuad_notice_period_to_terminate_renewal | 222 | 0 | 0.000 | 0.0000 |  |
| cuad_post-termination_services | 808 | 0 | 0.000 | 0.0000 |  |
| cuad_price_restrictions | 46 | 0 | 0.000 | 0.0000 |  |
| cuad_renewal_term | 386 | 0 | 0.000 | 0.0000 |  |
| cuad_revenue-profit_sharing | 774 | 0 | 0.000 | 0.0000 |  |
| cuad_rofr-rofo-rofn | 690 | 0 | 0.000 | 0.0000 |  |
| cuad_source_code_escrow | 118 | 0 | 0.000 | 0.0000 |  |
| cuad_termination_for_convenience | 430 | 0 | 0.000 | 0.0000 |  |
| cuad_third_party_beneficiary | 68 | 0 | 0.000 | 0.0000 |  |
| cuad_uncapped_liability | 294 | 0 | 0.000 | 0.0000 |  |
| cuad_unlimited-all-you-can-eat-license | 48 | 0 | 0.000 | 0.0000 |  |
| cuad_volume_restriction | 322 | 0 | 0.000 | 0.0000 |  |
| cuad_warranty_duration | 320 | 0 | 0.000 | 0.0000 |  |
| definition_classification | 1337 | 0 | 0.000 | 0.0000 |  |
| definition_extraction | 687 | 0 | 0.000 | 0.0000 |  |
| diversity_1 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_2 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_3 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_4 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_5 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_6 | 300 | 0 | 0.000 | 0.0000 |  |
| function_of_decision_section | 367 | 0 | 0.000 | 0.0000 |  |
| hearsay | 94 | 0 | 0.000 | 0.0000 |  |
| insurance_policy_interpretation | 133 | 0 | 0.000 | 0.0000 |  |
| jcrew_blocker | 54 | 0 | 0.000 | 0.0000 |  |
| international_citizenship_questions | 9306 | 0 | 0.000 | 0.0000 |  |
| nys_judicial_ethics | 292 | 0 | 0.000 | 0.0000 |  |
| learned_hands_benefits | 66 | 0 | 0.000 | 0.0000 |  |
| learned_hands_business | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_consumer | 614 | 0 | 0.000 | 0.0000 |  |
| learned_hands_courts | 192 | 0 | 0.000 | 0.0000 |  |
| learned_hands_crime | 688 | 0 | 0.000 | 0.0000 |  |
| learned_hands_divorce | 150 | 0 | 0.000 | 0.0000 |  |
| learned_hands_domestic_violence | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_education | 56 | 0 | 0.000 | 0.0000 |  |
| learned_hands_employment | 710 | 0 | 0.000 | 0.0000 |  |
| learned_hands_estates | 178 | 0 | 0.000 | 0.0000 |  |
| learned_hands_family | 2265 | 0 | 0.000 | 0.0000 |  |
| learned_hands_health | 226 | 0 | 0.000 | 0.0000 |  |
| learned_hands_housing | 4494 | 0 | 0.000 | 0.0000 |  |
| learned_hands_immigration | 134 | 0 | 0.000 | 0.0000 |  |
| learned_hands_torts | 432 | 0 | 0.000 | 0.0000 |  |
| learned_hands_traffic | 556 | 0 | 0.000 | 0.0000 |  |
| legal_reasoning_causality | 55 | 0 | 0.000 | 0.0000 |  |
| maud_ability_to_consummate_concept_is_subject_to_mae_carveouts | 69 | 0 | 0.000 | 0.0000 |  |
| maud_financial_point_of_view_is_the_sole_consideration | 112 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_fundamental_target_rws_bringdown_standard | 175 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_general_rw_bringdown_timing_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_capitalization_rw_(outstanding_shares)_bringdown_standard_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_additional_matching_rights_period_for_modifications_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_application_of_buyer_consent_requirement_(negative_interim_covenant) | 180 | 0 | 0.000 | 0.0000 |  |
| maud_buyer_consent_requirement_(ordinary_course) | 181 | 0 | 0.000 | 0.0000 |  |
| maud_change_in_law__subject_to_disproportionate_impact_modifier | 99 | 0 | 0.000 | 0.0000 |  |
| maud_changes_in_gaap_or_other_accounting_principles__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_in_response_to_intervening_event | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_with_board_fiduciary_determination_only | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(intervening_event) | 84 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(superior_offer) | 100 | 0 | 0.000 | 0.0000 |  |
| maud_definition_contains_knowledge_requirement_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_asset_deals | 146 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_stock_deals | 148 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception__board_determination_standard | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception_board_determination_trigger_(no_shop) | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fls_(mae)_standard | 77 | 0 | 0.000 | 0.0000 |  |
| maud_general_economic_and_financial_conditions_subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_includes_consistent_with_past_practice | 181 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(ftr) | 132 | 0 | 0.000 | 0.0000 |  |
| maud_intervening_event_-_required_to_occur_after_signing_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_knowledge_definition | 167 | 0 | 0.000 | 0.0000 |  |
| maud_liability_standard_for_no-shop_breach_by_target_non-do_representatives | 156 | 0 | 0.000 | 0.0000 |  |
| maud_ordinary_course_efforts_standard | 181 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event_specific_reference_to_pandemic-related_governmental_responses_or_measures | 98 | 0 | 0.000 | 0.0000 |  |
| maud_relational_language_(mae)_applies_to | 90 | 0 | 0.000 | 0.0000 |  |
| maud_specific_performance | 178 | 0 | 0.000 | 0.0000 |  |
| maud_tail_period_length | 179 | 0 | 0.000 | 0.0000 |  |
| maud_type_of_consideration | 172 | 0 | 0.000 | 0.0000 |  |
| opp115_data_retention | 88 | 0 | 0.000 | 0.0000 |  |
| opp115_data_security | 1334 | 0 | 0.000 | 0.0000 |  |
| opp115_do_not_track | 110 | 0 | 0.000 | 0.0000 |  |
| opp115_first_party_collection_use | 2086 | 0 | 0.000 | 0.0000 |  |
| opp115_international_and_specific_audiences | 980 | 0 | 0.000 | 0.0000 |  |
| opp115_policy_change | 431 | 0 | 0.000 | 0.0000 |  |
| opp115_third_party_sharing_collection | 1590 | 0 | 0.000 | 0.0000 |  |
| opp115_user_access,_edit_and_deletion | 462 | 0 | 0.000 | 0.0000 |  |
| opp115_user_choice_control | 1546 | 0 | 0.000 | 0.0000 |  |
| oral_argument_question_purpose | 312 | 0 | 0.000 | 0.0000 |  |
| overruling | 2394 | 0 | 0.000 | 0.0000 |  |
| personal_jurisdiction | 50 | 0 | 0.000 | 0.0000 |  |
| privacy_policy_entailment | 4335 | 0 | 0.000 | 0.0000 |  |
| privacy_policy_qa | 10923 | 0 | 0.000 | 0.0000 |  |
| proa | 95 | 0 | 0.000 | 0.0000 |  |
| rule_qa | 50 | 0 | 0.000 | — | eval_error: Exception |
| scalr | 571 | 0 | 0.000 | 0.0000 |  |
| ssla_company_defendants | 1228 | 0 | 0.000 | 0.0045 |  |
| ssla_individual_defendants | 1012 | 0 | 0.000 | 0.0000 |  |
| ssla_plaintiff | 1033 | 0 | 0.000 | 0.0000 |  |
| sara_entailment | 272 | 0 | 0.000 | 0.0000 |  |
| sara_numeric | 96 | 0 | 0.000 | 0.0000 |  |
| successor_liability | 47 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_accountability | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_verification | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_accountability | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_verification | 379 | 0 | 0.000 | 0.0000 |  |
| telemarketing_sales_rule | 47 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_dictionaries | 107 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_plain | 165 | 0 | 0.000 | 0.0000 |  |
| ucc_v_common_law | 94 | 0 | 0.000 | 0.0000 |  |
| unfair_tos | 3813 | 0 | 0.000 | 0.0000 |  |

### Run 2026-01-26 10:27:54Z — vera-run:abercrombie:perTask=3

- Predictions: `/tmp/predictions.jsonl`
- Tasks: `162`
- Weighted coverage: `0.0000`
- Macro avg (scored tasks): `0.0002`
- Weighted avg (scored tasks): `0.0001`

| task | n_test | n_pred | coverage | score | note |
|---|---:|---:|---:|---:|---|
| abercrombie | 95 | 3 | 0.032 | 0.0316 |  |
| canada_tax_court_outcomes | 244 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_classification | 108 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_open | 53 | 0 | 0.000 | 0.0000 |  |
| consumer_contracts_qa | 396 | 0 | 0.000 | 0.0000 |  |
| contract_nli_confidentiality_of_agreement | 82 | 0 | 0.000 | 0.0000 |  |
| contract_nli_explicit_identification | 109 | 0 | 0.000 | 0.0000 |  |
| contract_nli_inclusion_of_verbally_conveyed_information | 139 | 0 | 0.000 | 0.0000 |  |
| contract_nli_limited_use | 208 | 0 | 0.000 | 0.0000 |  |
| contract_nli_no_licensing | 162 | 0 | 0.000 | 0.0000 |  |
| contract_nli_notice_on_compelled_disclosure | 142 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_acquirement_of_similar_information | 178 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_copy | 87 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_development_of_similar_information | 136 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_post-agreement_possession | 111 | 0 | 0.000 | 0.0000 |  |
| contract_nli_return_of_confidential_information | 66 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_employees | 170 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_third-parties | 180 | 0 | 0.000 | 0.0000 |  |
| contract_nli_survival_of_obligations | 157 | 0 | 0.000 | 0.0000 |  |
| contract_qa | 80 | 0 | 0.000 | 0.0000 |  |
| corporate_lobbying | 490 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensee | 198 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensor | 88 | 0 | 0.000 | 0.0000 |  |
| cuad_anti-assignment | 1172 | 0 | 0.000 | 0.0000 |  |
| cuad_audit_rights | 1216 | 0 | 0.000 | 0.0000 |  |
| cuad_cap_on_liability | 1246 | 0 | 0.000 | 0.0000 |  |
| cuad_change_of_control | 416 | 0 | 0.000 | 0.0000 |  |
| cuad_competitive_restriction_exception | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_covenant_not_to_sue | 308 | 0 | 0.000 | 0.0000 |  |
| cuad_effective_date | 236 | 0 | 0.000 | 0.0000 |  |
| cuad_exclusivity | 762 | 0 | 0.000 | 0.0000 |  |
| cuad_expiration_date | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_governing_law | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_insurance | 1030 | 0 | 0.000 | 0.0000 |  |
| cuad_ip_ownership_assignment | 576 | 0 | 0.000 | 0.0000 |  |
| cuad_irrevocable_or_perpetual_license | 280 | 0 | 0.000 | 0.0000 |  |
| cuad_joint_ip_ownership | 192 | 0 | 0.000 | 0.0000 |  |
| cuad_license_grant | 1396 | 0 | 0.000 | 0.0000 |  |
| cuad_liquidated_damages | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_minimum_commitment | 772 | 0 | 0.000 | 0.0000 |  |
| cuad_most_favored_nation | 64 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_customers | 84 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_employees | 142 | 0 | 0.000 | 0.0000 |  |
| cuad_non-compete | 442 | 0 | 0.000 | 0.0000 |  |
| cuad_non-disparagement | 100 | 0 | 0.000 | 0.0000 |  |
| cuad_non-transferable_license | 542 | 0 | 0.000 | 0.0000 |  |
| cuad_notice_period_to_terminate_renewal | 222 | 0 | 0.000 | 0.0000 |  |
| cuad_post-termination_services | 808 | 0 | 0.000 | 0.0000 |  |
| cuad_price_restrictions | 46 | 0 | 0.000 | 0.0000 |  |
| cuad_renewal_term | 386 | 0 | 0.000 | 0.0000 |  |
| cuad_revenue-profit_sharing | 774 | 0 | 0.000 | 0.0000 |  |
| cuad_rofr-rofo-rofn | 690 | 0 | 0.000 | 0.0000 |  |
| cuad_source_code_escrow | 118 | 0 | 0.000 | 0.0000 |  |
| cuad_termination_for_convenience | 430 | 0 | 0.000 | 0.0000 |  |
| cuad_third_party_beneficiary | 68 | 0 | 0.000 | 0.0000 |  |
| cuad_uncapped_liability | 294 | 0 | 0.000 | 0.0000 |  |
| cuad_unlimited-all-you-can-eat-license | 48 | 0 | 0.000 | 0.0000 |  |
| cuad_volume_restriction | 322 | 0 | 0.000 | 0.0000 |  |
| cuad_warranty_duration | 320 | 0 | 0.000 | 0.0000 |  |
| definition_classification | 1337 | 0 | 0.000 | 0.0000 |  |
| definition_extraction | 687 | 0 | 0.000 | 0.0000 |  |
| diversity_1 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_2 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_3 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_4 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_5 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_6 | 300 | 0 | 0.000 | 0.0000 |  |
| function_of_decision_section | 367 | 0 | 0.000 | 0.0000 |  |
| hearsay | 94 | 0 | 0.000 | 0.0000 |  |
| insurance_policy_interpretation | 133 | 0 | 0.000 | 0.0000 |  |
| jcrew_blocker | 54 | 0 | 0.000 | 0.0000 |  |
| international_citizenship_questions | 9306 | 0 | 0.000 | 0.0000 |  |
| nys_judicial_ethics | 292 | 0 | 0.000 | 0.0000 |  |
| learned_hands_benefits | 66 | 0 | 0.000 | 0.0000 |  |
| learned_hands_business | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_consumer | 614 | 0 | 0.000 | 0.0000 |  |
| learned_hands_courts | 192 | 0 | 0.000 | 0.0000 |  |
| learned_hands_crime | 688 | 0 | 0.000 | 0.0000 |  |
| learned_hands_divorce | 150 | 0 | 0.000 | 0.0000 |  |
| learned_hands_domestic_violence | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_education | 56 | 0 | 0.000 | 0.0000 |  |
| learned_hands_employment | 710 | 0 | 0.000 | 0.0000 |  |
| learned_hands_estates | 178 | 0 | 0.000 | 0.0000 |  |
| learned_hands_family | 2265 | 0 | 0.000 | 0.0000 |  |
| learned_hands_health | 226 | 0 | 0.000 | 0.0000 |  |
| learned_hands_housing | 4494 | 0 | 0.000 | 0.0000 |  |
| learned_hands_immigration | 134 | 0 | 0.000 | 0.0000 |  |
| learned_hands_torts | 432 | 0 | 0.000 | 0.0000 |  |
| learned_hands_traffic | 556 | 0 | 0.000 | 0.0000 |  |
| legal_reasoning_causality | 55 | 0 | 0.000 | 0.0000 |  |
| maud_ability_to_consummate_concept_is_subject_to_mae_carveouts | 69 | 0 | 0.000 | 0.0000 |  |
| maud_financial_point_of_view_is_the_sole_consideration | 112 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_fundamental_target_rws_bringdown_standard | 175 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_general_rw_bringdown_timing_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_capitalization_rw_(outstanding_shares)_bringdown_standard_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_additional_matching_rights_period_for_modifications_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_application_of_buyer_consent_requirement_(negative_interim_covenant) | 180 | 0 | 0.000 | 0.0000 |  |
| maud_buyer_consent_requirement_(ordinary_course) | 181 | 0 | 0.000 | 0.0000 |  |
| maud_change_in_law__subject_to_disproportionate_impact_modifier | 99 | 0 | 0.000 | 0.0000 |  |
| maud_changes_in_gaap_or_other_accounting_principles__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_in_response_to_intervening_event | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_with_board_fiduciary_determination_only | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(intervening_event) | 84 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(superior_offer) | 100 | 0 | 0.000 | 0.0000 |  |
| maud_definition_contains_knowledge_requirement_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_asset_deals | 146 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_stock_deals | 148 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception__board_determination_standard | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception_board_determination_trigger_(no_shop) | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fls_(mae)_standard | 77 | 0 | 0.000 | 0.0000 |  |
| maud_general_economic_and_financial_conditions_subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_includes_consistent_with_past_practice | 181 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(ftr) | 132 | 0 | 0.000 | 0.0000 |  |
| maud_intervening_event_-_required_to_occur_after_signing_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_knowledge_definition | 167 | 0 | 0.000 | 0.0000 |  |
| maud_liability_standard_for_no-shop_breach_by_target_non-do_representatives | 156 | 0 | 0.000 | 0.0000 |  |
| maud_ordinary_course_efforts_standard | 181 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event_specific_reference_to_pandemic-related_governmental_responses_or_measures | 98 | 0 | 0.000 | 0.0000 |  |
| maud_relational_language_(mae)_applies_to | 90 | 0 | 0.000 | 0.0000 |  |
| maud_specific_performance | 178 | 0 | 0.000 | 0.0000 |  |
| maud_tail_period_length | 179 | 0 | 0.000 | 0.0000 |  |
| maud_type_of_consideration | 172 | 0 | 0.000 | 0.0000 |  |
| opp115_data_retention | 88 | 0 | 0.000 | 0.0000 |  |
| opp115_data_security | 1334 | 0 | 0.000 | 0.0000 |  |
| opp115_do_not_track | 110 | 0 | 0.000 | 0.0000 |  |
| opp115_first_party_collection_use | 2086 | 0 | 0.000 | 0.0000 |  |
| opp115_international_and_specific_audiences | 980 | 0 | 0.000 | 0.0000 |  |
| opp115_policy_change | 431 | 0 | 0.000 | 0.0000 |  |
| opp115_third_party_sharing_collection | 1590 | 0 | 0.000 | 0.0000 |  |
| opp115_user_access,_edit_and_deletion | 462 | 0 | 0.000 | 0.0000 |  |
| opp115_user_choice_control | 1546 | 0 | 0.000 | 0.0000 |  |
| oral_argument_question_purpose | 312 | 0 | 0.000 | 0.0000 |  |
| overruling | 2394 | 0 | 0.000 | 0.0000 |  |
| personal_jurisdiction | 50 | 0 | 0.000 | 0.0000 |  |
| privacy_policy_entailment | 4335 | 0 | 0.000 | 0.0000 |  |
| privacy_policy_qa | 10923 | 0 | 0.000 | 0.0000 |  |
| proa | 95 | 0 | 0.000 | 0.0000 |  |
| rule_qa | 50 | 0 | 0.000 | — | eval_error: Exception |
| scalr | 571 | 0 | 0.000 | 0.0000 |  |
| ssla_company_defendants | 1228 | 0 | 0.000 | 0.0045 |  |
| ssla_individual_defendants | 1012 | 0 | 0.000 | 0.0000 |  |
| ssla_plaintiff | 1033 | 0 | 0.000 | 0.0000 |  |
| sara_entailment | 272 | 0 | 0.000 | 0.0000 |  |
| sara_numeric | 96 | 0 | 0.000 | 0.0000 |  |
| successor_liability | 47 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_accountability | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_verification | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_accountability | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_verification | 379 | 0 | 0.000 | 0.0000 |  |
| telemarketing_sales_rule | 47 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_dictionaries | 107 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_plain | 165 | 0 | 0.000 | 0.0000 |  |
| ucc_v_common_law | 94 | 0 | 0.000 | 0.0000 |  |
| unfair_tos | 3813 | 0 | 0.000 | 0.0000 |  |

### Run 2026-01-26 10:30:00Z — vera-run:abercrombie+hearsay+personal_jurisdiction:perTask=20

- Predictions: `/tmp/predictions.jsonl`
- Tasks: `162`
- Weighted coverage: `0.0007`
- Macro avg (scored tasks): `0.0042`
- Weighted avg (scored tasks): `0.0006`

| task | n_test | n_pred | coverage | score | note |
|---|---:|---:|---:|---:|---|
| abercrombie | 95 | 20 | 0.211 | 0.1684 |  |
| canada_tax_court_outcomes | 244 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_classification | 108 | 0 | 0.000 | 0.0000 |  |
| citation_prediction_open | 53 | 0 | 0.000 | 0.0000 |  |
| consumer_contracts_qa | 396 | 0 | 0.000 | 0.0000 |  |
| contract_nli_confidentiality_of_agreement | 82 | 0 | 0.000 | 0.0000 |  |
| contract_nli_explicit_identification | 109 | 0 | 0.000 | 0.0000 |  |
| contract_nli_inclusion_of_verbally_conveyed_information | 139 | 0 | 0.000 | 0.0000 |  |
| contract_nli_limited_use | 208 | 0 | 0.000 | 0.0000 |  |
| contract_nli_no_licensing | 162 | 0 | 0.000 | 0.0000 |  |
| contract_nli_notice_on_compelled_disclosure | 142 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_acquirement_of_similar_information | 178 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_copy | 87 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_development_of_similar_information | 136 | 0 | 0.000 | 0.0000 |  |
| contract_nli_permissible_post-agreement_possession | 111 | 0 | 0.000 | 0.0000 |  |
| contract_nli_return_of_confidential_information | 66 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_employees | 170 | 0 | 0.000 | 0.0000 |  |
| contract_nli_sharing_with_third-parties | 180 | 0 | 0.000 | 0.0000 |  |
| contract_nli_survival_of_obligations | 157 | 0 | 0.000 | 0.0000 |  |
| contract_qa | 80 | 0 | 0.000 | 0.0000 |  |
| corporate_lobbying | 490 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensee | 198 | 0 | 0.000 | 0.0000 |  |
| cuad_affiliate_license-licensor | 88 | 0 | 0.000 | 0.0000 |  |
| cuad_anti-assignment | 1172 | 0 | 0.000 | 0.0000 |  |
| cuad_audit_rights | 1216 | 0 | 0.000 | 0.0000 |  |
| cuad_cap_on_liability | 1246 | 0 | 0.000 | 0.0000 |  |
| cuad_change_of_control | 416 | 0 | 0.000 | 0.0000 |  |
| cuad_competitive_restriction_exception | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_covenant_not_to_sue | 308 | 0 | 0.000 | 0.0000 |  |
| cuad_effective_date | 236 | 0 | 0.000 | 0.0000 |  |
| cuad_exclusivity | 762 | 0 | 0.000 | 0.0000 |  |
| cuad_expiration_date | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_governing_law | 876 | 0 | 0.000 | 0.0000 |  |
| cuad_insurance | 1030 | 0 | 0.000 | 0.0000 |  |
| cuad_ip_ownership_assignment | 576 | 0 | 0.000 | 0.0000 |  |
| cuad_irrevocable_or_perpetual_license | 280 | 0 | 0.000 | 0.0000 |  |
| cuad_joint_ip_ownership | 192 | 0 | 0.000 | 0.0000 |  |
| cuad_license_grant | 1396 | 0 | 0.000 | 0.0000 |  |
| cuad_liquidated_damages | 220 | 0 | 0.000 | 0.0000 |  |
| cuad_minimum_commitment | 772 | 0 | 0.000 | 0.0000 |  |
| cuad_most_favored_nation | 64 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_customers | 84 | 0 | 0.000 | 0.0000 |  |
| cuad_no-solicit_of_employees | 142 | 0 | 0.000 | 0.0000 |  |
| cuad_non-compete | 442 | 0 | 0.000 | 0.0000 |  |
| cuad_non-disparagement | 100 | 0 | 0.000 | 0.0000 |  |
| cuad_non-transferable_license | 542 | 0 | 0.000 | 0.0000 |  |
| cuad_notice_period_to_terminate_renewal | 222 | 0 | 0.000 | 0.0000 |  |
| cuad_post-termination_services | 808 | 0 | 0.000 | 0.0000 |  |
| cuad_price_restrictions | 46 | 0 | 0.000 | 0.0000 |  |
| cuad_renewal_term | 386 | 0 | 0.000 | 0.0000 |  |
| cuad_revenue-profit_sharing | 774 | 0 | 0.000 | 0.0000 |  |
| cuad_rofr-rofo-rofn | 690 | 0 | 0.000 | 0.0000 |  |
| cuad_source_code_escrow | 118 | 0 | 0.000 | 0.0000 |  |
| cuad_termination_for_convenience | 430 | 0 | 0.000 | 0.0000 |  |
| cuad_third_party_beneficiary | 68 | 0 | 0.000 | 0.0000 |  |
| cuad_uncapped_liability | 294 | 0 | 0.000 | 0.0000 |  |
| cuad_unlimited-all-you-can-eat-license | 48 | 0 | 0.000 | 0.0000 |  |
| cuad_volume_restriction | 322 | 0 | 0.000 | 0.0000 |  |
| cuad_warranty_duration | 320 | 0 | 0.000 | 0.0000 |  |
| definition_classification | 1337 | 0 | 0.000 | 0.0000 |  |
| definition_extraction | 687 | 0 | 0.000 | 0.0000 |  |
| diversity_1 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_2 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_3 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_4 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_5 | 300 | 0 | 0.000 | 0.0000 |  |
| diversity_6 | 300 | 0 | 0.000 | 0.0000 |  |
| function_of_decision_section | 367 | 0 | 0.000 | 0.0000 |  |
| hearsay | 94 | 20 | 0.213 | 0.1887 |  |
| insurance_policy_interpretation | 133 | 0 | 0.000 | 0.0000 |  |
| jcrew_blocker | 54 | 0 | 0.000 | 0.0000 |  |
| international_citizenship_questions | 9306 | 0 | 0.000 | 0.0000 |  |
| nys_judicial_ethics | 292 | 0 | 0.000 | 0.0000 |  |
| learned_hands_benefits | 66 | 0 | 0.000 | 0.0000 |  |
| learned_hands_business | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_consumer | 614 | 0 | 0.000 | 0.0000 |  |
| learned_hands_courts | 192 | 0 | 0.000 | 0.0000 |  |
| learned_hands_crime | 688 | 0 | 0.000 | 0.0000 |  |
| learned_hands_divorce | 150 | 0 | 0.000 | 0.0000 |  |
| learned_hands_domestic_violence | 174 | 0 | 0.000 | 0.0000 |  |
| learned_hands_education | 56 | 0 | 0.000 | 0.0000 |  |
| learned_hands_employment | 710 | 0 | 0.000 | 0.0000 |  |
| learned_hands_estates | 178 | 0 | 0.000 | 0.0000 |  |
| learned_hands_family | 2265 | 0 | 0.000 | 0.0000 |  |
| learned_hands_health | 226 | 0 | 0.000 | 0.0000 |  |
| learned_hands_housing | 4494 | 0 | 0.000 | 0.0000 |  |
| learned_hands_immigration | 134 | 0 | 0.000 | 0.0000 |  |
| learned_hands_torts | 432 | 0 | 0.000 | 0.0000 |  |
| learned_hands_traffic | 556 | 0 | 0.000 | 0.0000 |  |
| legal_reasoning_causality | 55 | 0 | 0.000 | 0.0000 |  |
| maud_ability_to_consummate_concept_is_subject_to_mae_carveouts | 69 | 0 | 0.000 | 0.0000 |  |
| maud_financial_point_of_view_is_the_sole_consideration | 112 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_fundamental_target_rws_bringdown_standard | 175 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_general_rw_bringdown_timing_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_accuracy_of_target_capitalization_rw_(outstanding_shares)_bringdown_standard_answer | 181 | 0 | 0.000 | 0.0000 |  |
| maud_additional_matching_rights_period_for_modifications_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_application_of_buyer_consent_requirement_(negative_interim_covenant) | 180 | 0 | 0.000 | 0.0000 |  |
| maud_buyer_consent_requirement_(ordinary_course) | 181 | 0 | 0.000 | 0.0000 |  |
| maud_change_in_law__subject_to_disproportionate_impact_modifier | 99 | 0 | 0.000 | 0.0000 |  |
| maud_changes_in_gaap_or_other_accounting_principles__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_in_response_to_intervening_event | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_permitted_with_board_fiduciary_determination_only | 100 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(intervening_event) | 84 | 0 | 0.000 | 0.0000 |  |
| maud_cor_standard_(superior_offer) | 100 | 0 | 0.000 | 0.0000 |  |
| maud_definition_contains_knowledge_requirement_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_asset_deals | 146 | 0 | 0.000 | 0.0000 |  |
| maud_definition_includes_stock_deals | 148 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception__board_determination_standard | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fiduciary_exception_board_determination_trigger_(no_shop) | 179 | 0 | 0.000 | 0.0000 |  |
| maud_fls_(mae)_standard | 77 | 0 | 0.000 | 0.0000 |  |
| maud_general_economic_and_financial_conditions_subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_includes_consistent_with_past_practice | 181 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(cor) | 158 | 0 | 0.000 | 0.0000 |  |
| maud_initial_matching_rights_period_(ftr) | 132 | 0 | 0.000 | 0.0000 |  |
| maud_intervening_event_-_required_to_occur_after_signing_-_answer | 147 | 0 | 0.000 | 0.0000 |  |
| maud_knowledge_definition | 167 | 0 | 0.000 | 0.0000 |  |
| maud_liability_standard_for_no-shop_breach_by_target_non-do_representatives | 156 | 0 | 0.000 | 0.0000 |  |
| maud_ordinary_course_efforts_standard | 181 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event__subject_to_disproportionate_impact_modifier | 98 | 0 | 0.000 | 0.0000 |  |
| maud_pandemic_or_other_public_health_event_specific_reference_to_pandemic-related_governmental_responses_or_measures | 98 | 0 | 0.000 | 0.0000 |  |
| maud_relational_language_(mae)_applies_to | 90 | 0 | 0.000 | 0.0000 |  |
| maud_specific_performance | 178 | 0 | 0.000 | 0.0000 |  |
| maud_tail_period_length | 179 | 0 | 0.000 | 0.0000 |  |
| maud_type_of_consideration | 172 | 0 | 0.000 | 0.0000 |  |
| opp115_data_retention | 88 | 0 | 0.000 | 0.0000 |  |
| opp115_data_security | 1334 | 0 | 0.000 | 0.0000 |  |
| opp115_do_not_track | 110 | 0 | 0.000 | 0.0000 |  |
| opp115_first_party_collection_use | 2086 | 0 | 0.000 | 0.0000 |  |
| opp115_international_and_specific_audiences | 980 | 0 | 0.000 | 0.0000 |  |
| opp115_policy_change | 431 | 0 | 0.000 | 0.0000 |  |
| opp115_third_party_sharing_collection | 1590 | 0 | 0.000 | 0.0000 |  |
| opp115_user_access,_edit_and_deletion | 462 | 0 | 0.000 | 0.0000 |  |
| opp115_user_choice_control | 1546 | 0 | 0.000 | 0.0000 |  |
| oral_argument_question_purpose | 312 | 0 | 0.000 | 0.0000 |  |
| overruling | 2394 | 0 | 0.000 | 0.0000 |  |
| personal_jurisdiction | 50 | 20 | 0.400 | 0.3112 |  |
| privacy_policy_entailment | 4335 | 0 | 0.000 | 0.0000 |  |
| privacy_policy_qa | 10923 | 0 | 0.000 | 0.0000 |  |
| proa | 95 | 0 | 0.000 | 0.0000 |  |
| rule_qa | 50 | 0 | 0.000 | — | eval_error: Exception |
| scalr | 571 | 0 | 0.000 | 0.0000 |  |
| ssla_company_defendants | 1228 | 0 | 0.000 | 0.0045 |  |
| ssla_individual_defendants | 1012 | 0 | 0.000 | 0.0000 |  |
| ssla_plaintiff | 1033 | 0 | 0.000 | 0.0000 |  |
| sara_entailment | 272 | 0 | 0.000 | 0.0000 |  |
| sara_numeric | 96 | 0 | 0.000 | 0.0000 |  |
| successor_liability | 47 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_accountability | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_best_practice_verification | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_accountability | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_audits | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_certification | 378 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_training | 379 | 0 | 0.000 | 0.0000 |  |
| supply_chain_disclosure_disclosed_verification | 379 | 0 | 0.000 | 0.0000 |  |
| telemarketing_sales_rule | 47 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_dictionaries | 107 | 0 | 0.000 | 0.0000 |  |
| textualism_tool_plain | 165 | 0 | 0.000 | 0.0000 |  |
| ucc_v_common_law | 94 | 0 | 0.000 | 0.0000 |  |
| unfair_tos | 3813 | 0 | 0.000 | 0.0000 |  |
