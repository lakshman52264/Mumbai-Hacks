"""
Script to ingest mutual fund data into Firestore
This includes comprehensive data across different sectors and categories
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agents.mutual_funds_knowledge import mf_knowledge

# Sample comprehensive mutual fund data across sectors
MUTUAL_FUNDS_DATA = [
    # Large Cap Equity Funds
    {
        "fund_name": "HDFC Top 100 Fund",
        "amc": "HDFC Mutual Fund",
        "category": "equity",
        "sub_category": "large_cap",
        "sector": "diversified",
        "aum": 25000.0,
        "expense_ratio": 0.85,
        "min_investment": 5000.0,
        "returns": {"1y": 18.5, "3y": 22.3, "5y": 19.8},
        "risk": "moderate",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Invests in top 100 companies by market capitalization with focus on quality and growth",
        "top_holdings": ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "TCS"],
        "fund_manager": "Chirag Setalvad"
    },
    {
        "fund_name": "ICICI Prudential Bluechip Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "equity",
        "sub_category": "large_cap",
        "sector": "diversified",
        "aum": 30000.0,
        "expense_ratio": 0.95,
        "min_investment": 5000.0,
        "returns": {"1y": 17.8, "3y": 21.5, "5y": 18.9},
        "risk": "moderate",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Large cap fund focusing on established blue-chip companies",
        "top_holdings": ["Reliance", "HDFC Bank", "Infosys", "Kotak Bank", "ITC"],
        "fund_manager": "Sankaren Naren"
    },

    # Mid Cap Equity Funds
    {
        "fund_name": "Axis Midcap Fund",
        "amc": "Axis Mutual Fund",
        "category": "equity",
        "sub_category": "mid_cap",
        "sector": "diversified",
        "aum": 15000.0,
        "expense_ratio": 1.05,
        "min_investment": 5000.0,
        "returns": {"1y": 24.5, "3y": 28.7, "5y": 25.3},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Invests in mid-cap companies with strong growth potential",
        "top_holdings": ["Voltas", "Tube Investments", "Crompton Greaves", "Dixon Technologies", "Polycab"],
        "fund_manager": "Shreyash Devalkar"
    },
    {
        "fund_name": "DSP Midcap Fund",
        "amc": "DSP Mutual Fund",
        "category": "equity",
        "sub_category": "mid_cap",
        "sector": "diversified",
        "aum": 12000.0,
        "expense_ratio": 1.15,
        "min_investment": 5000.0,
        "returns": {"1y": 22.8, "3y": 26.5, "5y": 23.7},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Growth-oriented mid-cap fund with quality focus",
        "top_holdings": ["Astral Poly", "KPIT Technologies", "Cummins India", "Escorts", "Carborundum"],
        "fund_manager": "Vinit Sambre"
    },

    # Small Cap Equity Funds
    {
        "fund_name": "Nippon India Small Cap Fund",
        "amc": "Nippon India Mutual Fund",
        "category": "equity",
        "sub_category": "small_cap",
        "sector": "diversified",
        "aum": 18000.0,
        "expense_ratio": 1.25,
        "min_investment": 5000.0,
        "returns": {"1y": 28.5, "3y": 32.8, "5y": 29.2},
        "risk": "very_high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "High-growth small cap fund for aggressive investors",
        "top_holdings": ["Fine Organic", "Aarti Industries", "Rainbow Children", "Wonderla", "Tata Elxsi"],
        "fund_manager": "Samir Rachh"
    },

    # Technology Sector Funds
    {
        "fund_name": "ICICI Prudential Technology Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "technology",
        "aum": 8000.0,
        "expense_ratio": 1.45,
        "min_investment": 5000.0,
        "returns": {"1y": 26.5, "3y": 30.2, "5y": 28.7},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Focused on IT and technology sector companies",
        "top_holdings": ["TCS", "Infosys", "HCL Tech", "Wipro", "Tech Mahindra"],
        "fund_manager": "Sharmila D'mello"
    },
    {
        "fund_name": "SBI Technology Opportunities Fund",
        "amc": "SBI Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "technology",
        "aum": 5000.0,
        "expense_ratio": 1.35,
        "min_investment": 5000.0,
        "returns": {"1y": 25.2, "3y": 29.5, "5y": 27.3},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Technology-focused fund capturing IT sector growth",
        "top_holdings": ["Infosys", "TCS", "Persistent Systems", "LTI Mindtree", "Coforge"],
        "fund_manager": "R. Srinivasan"
    },

    # Banking & Financial Services Funds
    {
        "fund_name": "HDFC Banking and PSU Debt Fund",
        "amc": "HDFC Mutual Fund",
        "category": "debt",
        "sub_category": "corporate_bond",
        "sector": "banking",
        "aum": 20000.0,
        "expense_ratio": 0.65,
        "min_investment": 5000.0,
        "returns": {"1y": 7.2, "3y": 7.8, "5y": 8.1},
        "risk": "low",
        "exit_load": "0.5% if redeemed within 3 months",
        "description": "Invests in high-quality banking and PSU bonds",
        "top_holdings": ["SBI Bonds", "HDFC Bank Bonds", "ICICI Bank Bonds", "Government Securities"],
        "fund_manager": "Anil Bamboli"
    },
    {
        "fund_name": "SBI Banking & Financial Services Fund",
        "amc": "SBI Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "banking",
        "aum": 12000.0,
        "expense_ratio": 1.25,
        "min_investment": 5000.0,
        "returns": {"1y": 20.5, "3y": 24.3, "5y": 21.7},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Focused on banking and financial services sector",
        "top_holdings": ["HDFC Bank", "ICICI Bank", "Kotak Bank", "SBI", "Bajaj Finance"],
        "fund_manager": "Dinesh Ahuja"
    },

    # Pharma & Healthcare Funds
    {
        "fund_name": "ICICI Prudential Pharma Healthcare Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "pharma",
        "aum": 6500.0,
        "expense_ratio": 1.38,
        "min_investment": 5000.0,
        "returns": {"1y": 22.8, "3y": 26.5, "5y": 24.2},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Healthcare and pharmaceutical sector focused fund",
        "top_holdings": ["Sun Pharma", "Dr. Reddy's", "Cipla", "Divi's Lab", "Apollo Hospitals"],
        "fund_manager": "Atul Patel"
    },

    # FMCG Funds
    {
        "fund_name": "Aditya Birla SL FMCG Fund",
        "amc": "Aditya Birla Sun Life Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "fmcg",
        "aum": 4000.0,
        "expense_ratio": 1.45,
        "min_investment": 5000.0,
        "returns": {"1y": 19.5, "3y": 21.8, "5y": 20.2},
        "risk": "moderate",
        "exit_load": "1% if redeemed within 1 year",
        "description": "FMCG sector fund focusing on consumer goods companies",
        "top_holdings": ["HUL", "ITC", "Nestle", "Britannia", "Dabur"],
        "fund_manager": "Dhaval Gala"
    },

    # Infrastructure Funds
    {
        "fund_name": "ICICI Prudential Infrastructure Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "equity",
        "sub_category": "sectoral",
        "sector": "infrastructure",
        "aum": 7500.0,
        "expense_ratio": 1.32,
        "min_investment": 5000.0,
        "returns": {"1y": 27.5, "3y": 31.2, "5y": 28.8},
        "risk": "high",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Infrastructure sector fund covering construction, capital goods",
        "top_holdings": ["L&T", "Siemens", "ABB", "KEC International", "Thermax"],
        "fund_manager": "Ihab Dalwai"
    },

    # Hybrid/Balanced Funds
    {
        "fund_name": "HDFC Hybrid Equity Fund",
        "amc": "HDFC Mutual Fund",
        "category": "hybrid",
        "sub_category": "aggressive",
        "sector": "diversified",
        "aum": 35000.0,
        "expense_ratio": 0.95,
        "min_investment": 5000.0,
        "returns": {"1y": 15.8, "3y": 18.5, "5y": 16.9},
        "risk": "moderate",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Aggressive hybrid fund with 65-80% equity allocation",
        "top_holdings": ["Mixed equity and debt securities"],
        "fund_manager": "Prashant Jain"
    },
    {
        "fund_name": "ICICI Prudential Balanced Advantage Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "hybrid",
        "sub_category": "balanced",
        "sector": "diversified",
        "aum": 45000.0,
        "expense_ratio": 0.88,
        "min_investment": 5000.0,
        "returns": {"1y": 14.2, "3y": 16.8, "5y": 15.5},
        "risk": "moderate",
        "exit_load": "1% if redeemed within 1 year",
        "description": "Dynamic asset allocation between equity and debt",
        "top_holdings": ["Mixed portfolio"],
        "fund_manager": "Sankaran Naren"
    },

    # ELSS (Tax Saving) Funds
    {
        "fund_name": "Axis Long Term Equity Fund",
        "amc": "Axis Mutual Fund",
        "category": "equity",
        "sub_category": "elss",
        "sector": "diversified",
        "aum": 28000.0,
        "expense_ratio": 0.95,
        "min_investment": 500.0,
        "returns": {"1y": 21.5, "3y": 24.8, "5y": 22.3},
        "risk": "high",
        "exit_load": "Nil (3-year lock-in)",
        "description": "Tax-saving ELSS fund under Section 80C with 3-year lock-in",
        "top_holdings": ["HDFC Bank", "Infosys", "ICICI Bank", "Reliance", "Kotak Bank"],
        "fund_manager": "Jinesh Gopani"
    },
    {
        "fund_name": "Mirae Asset Tax Saver Fund",
        "amc": "Mirae Asset Mutual Fund",
        "category": "equity",
        "sub_category": "elss",
        "sector": "diversified",
        "aum": 15000.0,
        "expense_ratio": 0.85,
        "min_investment": 500.0,
        "returns": {"1y": 22.8, "3y": 25.5, "5y": 23.1},
        "risk": "high",
        "exit_load": "Nil (3-year lock-in)",
        "description": "Diversified ELSS fund with tax benefits",
        "top_holdings": ["TCS", "HDFC Bank", "Reliance", "Bajaj Finance", "Asian Paints"],
        "fund_manager": "Neelesh Surana"
    },

    # Index Funds
    {
        "fund_name": "HDFC Index Fund - Nifty 50 Plan",
        "amc": "HDFC Mutual Fund",
        "category": "equity",
        "sub_category": "index",
        "sector": "diversified",
        "aum": 8000.0,
        "expense_ratio": 0.20,
        "min_investment": 5000.0,
        "returns": {"1y": 18.2, "3y": 20.5, "5y": 18.8},
        "risk": "moderate",
        "exit_load": "Nil",
        "description": "Passive index fund tracking Nifty 50",
        "top_holdings": ["All Nifty 50 stocks"],
        "fund_manager": "Passive Management Team"
    },

    # Debt Funds
    {
        "fund_name": "HDFC Liquid Fund",
        "amc": "HDFC Mutual Fund",
        "category": "debt",
        "sub_category": "liquid",
        "sector": "diversified",
        "aum": 50000.0,
        "expense_ratio": 0.25,
        "min_investment": 5000.0,
        "returns": {"1y": 6.5, "3y": 6.8, "5y": 7.0},
        "risk": "low",
        "exit_load": "Nil",
        "description": "Liquid fund for short-term parking of surplus funds",
        "top_holdings": ["Treasury Bills", "Commercial Papers", "Certificates of Deposit"],
        "fund_manager": "Anil Bamboli"
    },
    {
        "fund_name": "ICICI Prudential Corporate Bond Fund",
        "amc": "ICICI Prudential Mutual Fund",
        "category": "debt",
        "sub_category": "corporate_bond",
        "sector": "diversified",
        "aum": 15000.0,
        "expense_ratio": 0.55,
        "min_investment": 5000.0,
        "returns": {"1y": 7.8, "3y": 8.2, "5y": 8.5},
        "risk": "low",
        "exit_load": "0.25% if redeemed within 3 months",
        "description": "Invests primarily in AA+ and above rated corporate bonds",
        "top_holdings": ["HDFC Ltd Bonds", "Bajaj Finance Bonds", "LIC Housing Finance Bonds"],
        "fund_manager": "Manish Banthia"
    }
]


def main():
    """Main function to ingest mutual fund data"""
    print("=" * 80)
    print("Mutual Fund Data Ingestion Script")
    print("=" * 80)
    print(f"\nTotal funds to ingest: {len(MUTUAL_FUNDS_DATA)}")
    print("\nCategories covered:")
    categories = {}
    for fund in MUTUAL_FUNDS_DATA:
        cat = fund['sub_category']
        categories[cat] = categories.get(cat, 0) + 1

    for cat, count in sorted(categories.items()):
        print(f"  - {cat}: {count} funds")

    print("\nSectors covered:")
    sectors = {}
    for fund in MUTUAL_FUNDS_DATA:
        sec = fund.get('sector', 'N/A')
        sectors[sec] = sectors.get(sec, 0) + 1

    for sec, count in sorted(sectors.items()):
        print(f"  - {sec}: {count} funds")

    print("\n" + "=" * 80)
    confirm = input("\nProceed with ingestion? (yes/no): ")

    if confirm.lower() != 'yes':
        print("Ingestion cancelled.")
        return

    print("\nIngesting mutual fund data...")
    result = mf_knowledge.ingest_mutual_fund_data(MUTUAL_FUNDS_DATA)

    if result.get('success'):
        print(f"\n✅ Successfully ingested {result.get('count')} mutual funds!")
    else:
        print(f"\n❌ Error: {result.get('error')}")

    print("=" * 80)


if __name__ == "__main__":
    main()
