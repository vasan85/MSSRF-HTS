-- Populate missing fields with sample data for reports

-- Update household_master with sample data
UPDATE household_master 
SET 
  monthly_income_exact = CASE 
    WHEN monthly_income_exact IS NULL THEN FLOOR(5000 + RAND() * 15000)
    ELSE monthly_income_exact
  END,
  shg_membership = CASE 
    WHEN shg_membership IS NULL THEN IF(RAND() > 0.5, 'Yes', 'No')
    ELSE shg_membership
  END,
  fpo_membership = CASE 
    WHEN fpo_membership IS NULL THEN IF(RAND() > 0.7, 'Yes', 'No')
    ELSE fpo_membership
  END,
  gp_elected_member = CASE 
    WHEN gp_elected_member IS NULL THEN IF(RAND() > 0.8, 'Yes', 'No')
    ELSE gp_elected_member
  END,
  fishing_involved = CASE 
    WHEN fishing_involved IS NULL THEN IF(RAND() > 0.6, 'Yes', 'No')
    ELSE fishing_involved
  END,
  assets_ownership = CASE 
    WHEN assets_ownership IS NULL THEN IF(RAND() > 0.5, 'Yes', 'No')
    ELSE assets_ownership
  END,
  mssrf_support_earlier = CASE 
    WHEN mssrf_support_earlier IS NULL THEN IF(RAND() > 0.6, 'Yes', 'No')
    ELSE mssrf_support_earlier
  END,
  other_ngo_support = CASE 
    WHEN other_ngo_support IS NULL THEN IF(RAND() > 0.7, 'Yes', 'No')
    ELSE other_ngo_support
  END,
  ownership_status = CASE 
    WHEN ownership_status IS NULL THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Own'
        WHEN 1 THEN 'Rented'
        ELSE 'Lease'
      END
    ELSE ownership_status
  END,
  number_of_rooms = CASE 
    WHEN number_of_rooms IS NULL THEN FLOOR(1 + RAND() * 4)
    ELSE number_of_rooms
  END;

-- Update SHG loan amounts for members who have SHG membership
UPDATE household_master 
SET 
  shg_loan_savings = CASE 
    WHEN shg_membership='Yes' AND (shg_loan_savings IS NULL OR shg_loan_savings=0) THEN FLOOR(5000 + RAND() * 20000)
    ELSE shg_loan_savings
  END,
  shg_loan_bank = CASE 
    WHEN shg_membership='Yes' AND RAND() > 0.6 AND (shg_loan_bank IS NULL OR shg_loan_bank=0) THEN FLOOR(10000 + RAND() * 40000)
    ELSE shg_loan_bank
  END,
  shg_loan_mfi = CASE 
    WHEN shg_membership='Yes' AND RAND() > 0.7 AND (shg_loan_mfi IS NULL OR shg_loan_mfi=0) THEN FLOOR(5000 + RAND() * 25000)
    ELSE shg_loan_mfi
  END,
  shg_role = CASE 
    WHEN shg_membership='Yes' AND (shg_role IS NULL OR shg_role='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'President'
        WHEN 1 THEN 'Secretary'
        WHEN 2 THEN 'Treasurer'
        ELSE 'Member'
      END
    ELSE shg_role
  END,
  loan_reason = CASE 
    WHEN shg_membership='Yes' AND (loan_reason IS NULL OR loan_reason='') THEN 
      CASE FLOOR(RAND() * 6)
        WHEN 0 THEN 'Agriculture'
        WHEN 1 THEN 'Business'
        WHEN 2 THEN 'Education'
        WHEN 3 THEN 'Health'
        WHEN 4 THEN 'Housing'
        ELSE 'Consumption'
      END
    ELSE loan_reason
  END;

-- Update FPO details for members
UPDATE household_master 
SET 
  fpo_role = CASE 
    WHEN fpo_membership='Yes' AND (fpo_role IS NULL OR fpo_role='') THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Director'
        WHEN 1 THEN 'Shareholder'
        ELSE 'Member'
      END
    ELSE fpo_role
  END,
  fpo_type = CASE 
    WHEN fpo_membership='Yes' AND (fpo_type IS NULL OR fpo_type='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Farmer Producer Company'
        WHEN 1 THEN 'Fisheries Cooperative'
        WHEN 2 THEN 'Women Producer Group'
        ELSE 'Agricultural Cooperative'
      END
    ELSE fpo_type
  END,
  fpo_investment = CASE 
    WHEN fpo_membership='Yes' AND (fpo_investment IS NULL OR fpo_investment=0) THEN FLOOR(1000 + RAND() * 10000)
    ELSE fpo_investment
  END,
  fpo_commodity = CASE 
    WHEN fpo_membership='Yes' AND (fpo_commodity IS NULL OR fpo_commodity='') THEN 
      CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Rice'
        WHEN 1 THEN 'Fish'
        WHEN 2 THEN 'Vegetables'
        WHEN 3 THEN 'Milk'
        ELSE 'Spices'
      END
    ELSE fpo_commodity
  END;

-- Update fishing-related fields
UPDATE household_master 
SET 
  fishing_type = CASE 
    WHEN fishing_involved='Yes' AND (fishing_type IS NULL OR fishing_type='') THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Marine fishing'
        WHEN 1 THEN 'Inland fishing'
        ELSE 'Both marine and inland'
      END
    ELSE fishing_type
  END,
  boat_ownership = CASE 
    WHEN fishing_involved='Yes' AND (boat_ownership IS NULL OR boat_ownership='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Own boat'
        WHEN 1 THEN 'Shared boat'
        WHEN 2 THEN 'Rented boat'
        ELSE 'No boat'
      END
    ELSE boat_ownership
  END,
  boat_type = CASE 
    WHEN fishing_involved='Yes' AND boat_ownership IN ('Own boat', 'Shared boat') AND (boat_type IS NULL OR boat_type='') THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Motorized'
        WHEN 1 THEN 'Non-motorized'
        ELSE 'FRP boat'
      END
    ELSE boat_type
  END,
  gps_in_boat = CASE 
    WHEN fishing_involved='Yes' AND boat_ownership IN ('Own boat', 'Shared boat') AND (gps_in_boat IS NULL) THEN 
      IF(RAND() > 0.6, 'Yes', 'No')
    ELSE gps_in_boat
  END,
  fishing_frequency = CASE 
    WHEN fishing_involved='Yes' AND (fishing_frequency IS NULL OR fishing_frequency='') THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Daily'
        WHEN 1 THEN 'Weekly'
        ELSE 'Seasonal'
      END
    ELSE fishing_frequency
  END,
  storage_facilities = CASE 
    WHEN fishing_involved='Yes' AND (storage_facilities IS NULL OR storage_facilities='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Ice box'
        WHEN 1 THEN 'Cold storage'
        WHEN 2 THEN 'Ice box,Cold storage'
        ELSE 'No storage'
      END
    ELSE storage_facilities
  END;

-- Update land and asset details
UPDATE household_master 
SET 
  land_type_detail = CASE 
    WHEN assets_ownership='Yes' AND (land_type_detail IS NULL OR land_type_detail='') THEN 
      CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Agricultural land'
        WHEN 1 THEN 'Residential plot'
        WHEN 2 THEN 'Agricultural land,Residential plot'
        WHEN 3 THEN 'Pond/Tank'
        ELSE 'Wasteland'
      END
    ELSE land_type_detail
  END,
  asset_type = CASE 
    WHEN assets_ownership='Yes' AND (asset_type IS NULL OR asset_type='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Land'
        WHEN 1 THEN 'Livestock'
        WHEN 2 THEN 'Equipment'
        ELSE 'Vehicle'
      END
    ELSE asset_type
  END;

-- Update government schemes and NGO support details
UPDATE household_master 
SET 
  govt_schemes_benefit = CASE 
    WHEN govt_schemes_benefit IS NULL OR govt_schemes_benefit='' THEN 
      CASE FLOOR(RAND() * 6)
        WHEN 0 THEN 'MGNREGA'
        WHEN 1 THEN 'PM-KISAN'
        WHEN 2 THEN 'Pension scheme'
        WHEN 3 THEN 'MGNREGA,PM-KISAN'
        WHEN 4 THEN 'Housing scheme'
        ELSE 'None'
      END
    ELSE govt_schemes_benefit
  END,
  mssrf_support_details = CASE 
    WHEN mssrf_support_earlier='Yes' AND (mssrf_support_details IS NULL OR mssrf_support_details='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Livelihood training'
        WHEN 1 THEN 'Asset support'
        WHEN 2 THEN 'Capacity building'
        ELSE 'Financial assistance'
      END
    ELSE mssrf_support_details
  END,
  ngo_support_details = CASE 
    WHEN other_ngo_support='Yes' AND (ngo_support_details IS NULL OR ngo_support_details='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Health services'
        WHEN 1 THEN 'Education support'
        WHEN 2 THEN 'Skill training'
        ELSE 'Microfinance'
      END
    ELSE ngo_support_details
  END;

-- Update household_members with sample data
UPDATE household_members 
SET 
  shg_membership = CASE 
    WHEN shg_membership IS NULL THEN IF(age >= 18 AND RAND() > 0.6, 'Yes', 'No')
    ELSE shg_membership
  END,
  fpo_membership = CASE 
    WHEN fpo_membership IS NULL THEN IF(age >= 18 AND RAND() > 0.8, 'Yes', 'No')
    ELSE fpo_membership
  END,
  gp_elected_member = CASE 
    WHEN gp_elected_member IS NULL THEN IF(age >= 21 AND RAND() > 0.9, 'Yes', 'No')
    ELSE gp_elected_member
  END;

-- Update SHG loan amounts for household_members who have SHG membership
UPDATE household_members 
SET 
  shg_loan_savings = CASE 
    WHEN shg_membership='Yes' AND (shg_loan_savings IS NULL OR shg_loan_savings=0) THEN FLOOR(3000 + RAND() * 15000)
    ELSE shg_loan_savings
  END,
  shg_loan_bank = CASE 
    WHEN shg_membership='Yes' AND RAND() > 0.7 AND (shg_loan_bank IS NULL OR shg_loan_bank=0) THEN FLOOR(5000 + RAND() * 25000)
    ELSE shg_loan_bank
  END,
  shg_role = CASE 
    WHEN shg_membership='Yes' AND (shg_role IS NULL OR shg_role='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'President'
        WHEN 1 THEN 'Secretary'
        WHEN 2 THEN 'Treasurer'
        ELSE 'Member'
      END
    ELSE shg_role
  END,
  loan_reason = CASE 
    WHEN shg_membership='Yes' AND (loan_reason IS NULL OR loan_reason='') THEN 
      CASE FLOOR(RAND() * 6)
        WHEN 0 THEN 'Agriculture'
        WHEN 1 THEN 'Business'
        WHEN 2 THEN 'Education'
        WHEN 3 THEN 'Health'
        WHEN 4 THEN 'Housing'
        ELSE 'Consumption'
      END
    ELSE loan_reason
  END;

-- Update FPO details for household_members
UPDATE household_members 
SET 
  fpo_role = CASE 
    WHEN fpo_membership='Yes' AND (fpo_role IS NULL OR fpo_role='') THEN 
      CASE FLOOR(RAND() * 3)
        WHEN 0 THEN 'Director'
        WHEN 1 THEN 'Shareholder'
        ELSE 'Member'
      END
    ELSE fpo_role
  END,
  fpo_type = CASE 
    WHEN fpo_membership='Yes' AND (fpo_type IS NULL OR fpo_type='') THEN 
      CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Farmer Producer Company'
        WHEN 1 THEN 'Fisheries Cooperative'
        WHEN 2 THEN 'Women Producer Group'
        ELSE 'Agricultural Cooperative'
      END
    ELSE fpo_type
  END,
  fpo_investment = CASE 
    WHEN fpo_membership='Yes' AND (fpo_investment IS NULL OR fpo_investment=0) THEN FLOOR(500 + RAND() * 5000)
    ELSE fpo_investment
  END;

SELECT 'Data seeding completed successfully' as status;
