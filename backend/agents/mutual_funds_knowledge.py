"""
Mutual Funds Knowledge Base System
Provides intelligent mutual fund recommendations based on user profile and market data
Uses funds.json as the data source for recommendations
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Load the mutual funds data from JSON
def _load_funds_data() -> Dict[str, Any]:
    """Load mutual funds data from JSON file"""
    try:
        data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'funds.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading funds data: {e}")
        return {"meta": {}, "categories": []}

FUNDS_DATA = _load_funds_data()


# Mutual Fund Categories and Sectors
MF_CATEGORIES = {
    "equity": {
        "large_cap": "Large Cap Funds - Invest in top 100 companies by market cap",
        "mid_cap": "Mid Cap Funds - Invest in companies ranked 101-250 by market cap",
        "small_cap": "Small Cap Funds - Invest in companies ranked 251+ by market cap",
        "multi_cap": "Multi Cap Funds - Flexible allocation across market caps",
        "flexi_cap": "Flexi Cap Funds - Dynamic allocation across all market caps",
        "sectoral": "Sectoral/Thematic Funds - Focus on specific sectors",
        "index": "Index Funds - Track specific market indices",
        "elss": "ELSS - Tax-saving equity funds with 3-year lock-in"
    },
    "debt": {
        "liquid": "Liquid Funds - Very low risk, high liquidity",
        "short_duration": "Short Duration Funds - 1-3 year maturity",
        "medium_duration": "Medium Duration Funds - 3-4 year maturity",
        "long_duration": "Long Duration Funds - 7+ year maturity",
        "gilt": "Gilt Funds - Invest in government securities",
        "credit_risk": "Credit Risk Funds - Higher yield, moderate risk",
        "corporate_bond": "Corporate Bond Funds - Invest in corporate debt"
    },
    "hybrid": {
        "conservative": "Conservative Hybrid - 75-90% debt, 10-25% equity",
        "balanced": "Balanced Hybrid - 40-60% equity and debt",
        "aggressive": "Aggressive Hybrid - 65-80% equity, 20-35% debt",
        "arbitrage": "Arbitrage Funds - Exploit price differences",
        "equity_savings": "Equity Savings - Combination of equity, arbitrage, debt"
    }
}

SECTORS = {
    "technology": "IT, Software, Hardware, Internet",
    "banking": "Banks, NBFCs, Financial Services",
    "pharma": "Pharmaceuticals, Healthcare, Biotechnology",
    "fmcg": "Fast Moving Consumer Goods",
    "auto": "Automobiles, Auto Components",
    "infrastructure": "Construction, Capital Goods, Industrials",
    "energy": "Oil & Gas, Power, Renewables",
    "metals": "Steel, Aluminum, Mining",
    "realty": "Real Estate, Housing",
    "telecom": "Telecommunications, Media"
}


class MutualFundKnowledge:
    """Manages mutual fund knowledge base and recommendations"""

    def __init__(self):
        self.logger = logger
        self.funds_data = FUNDS_DATA

    def get_fund_recommendations(
        self,
        user_id: str,
        risk_profile: str = "moderate",
        investment_horizon: str = "medium",
        investment_amount: float = 10000,
        sectors: Optional[List[str]] = None,
        category_preference: Optional[str] = None,
        specific_categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get personalized mutual fund recommendations from JSON data

        Args:
            user_id: User ID
            risk_profile: low/moderate/high/very_high
            investment_horizon: short (< 1y) / medium (1-3y) / long (3y+)
            investment_amount: Amount to invest
            sectors: Preferred sectors
            category_preference: equity/debt/hybrid
            specific_categories: Specific fund category IDs to filter (e.g., ['nifty_50_index', 'small_cap'])
        """
        try:
            all_funds = []

            # Iterate through all categories in the JSON data
            for category in self.funds_data.get('categories', []):
                category_id = category.get('id', '')
                category_name = category.get('display_name', '')
                role = category.get('role_in_portfolio', '')

                # If specific categories are requested, only include those
                if specific_categories and category_id not in specific_categories:
                    continue

                # Iterate through funds in this category
                for fund in category.get('funds', []):
                    fund_data = dict(fund)
                    fund_data['category_id'] = category_id
                    fund_data['category_name'] = category_name
                    fund_data['role_in_portfolio'] = role

                    # Apply filters
                    fund_risk = fund_data.get('risk_level', 'Very High')

                    # Risk profile filtering
                    if risk_profile == 'low' and fund_risk not in ['Low', 'Moderately Low', 'Moderate']:
                        continue
                    elif risk_profile == 'moderate' and fund_risk not in ['Moderate', 'High', 'Very High']:
                        # Allow moderate to access most funds except extremely risky
                        pass
                    elif risk_profile == 'high' and fund_risk not in ['High', 'Very High']:
                        continue
                    elif risk_profile == 'very_high' and fund_risk != 'Very High':
                        continue

                    # Category preference filtering (only if specific categories not provided)
                    if not specific_categories and category_preference:
                        if category_preference == 'equity':
                            if category_id in ['gold', 'silver']:
                                continue
                        elif category_preference == 'commodity':
                            if category_id not in ['gold', 'silver']:
                                continue

                    # Sector filtering (from tags)
                    if sectors:
                        tags = fund_data.get('tags', [])
                        if not any(s.lower() in ','.join(tags).lower() for s in sectors):
                            continue

                    # Calculate recommendation score
                    score = self._calculate_fund_score(fund_data, investment_horizon, sectors)
                    fund_data['recommendation_score'] = score
                    all_funds.append(fund_data)

            # Sort by recommendation score
            all_funds.sort(key=lambda x: x.get('recommendation_score', 0), reverse=True)

            # Get top 5 recommendations
            top_recommendations = all_funds[:5]

            # Format recommendations with clean output
            formatted_recs = []
            for fund in top_recommendations:
                formatted_recs.append({
                    'fund_name': fund.get('scheme_name'),
                    'amc': fund.get('amc'),
                    'category': fund.get('category_name'),
                    'role': fund.get('role_in_portfolio'),
                    'risk_level': fund.get('risk_level'),
                    'is_index_fund': fund.get('is_index_fund'),
                    'returns': fund.get('trailing_returns_cagr_percent', {}),
                    'risk_metrics': fund.get('risk_metrics_est', {}),
                    'tags': fund.get('tags', []),
                    'benchmark': fund.get('benchmark'),
                    'recommendation_score': fund.get('recommendation_score', 0),
                    'why_recommended': self._generate_reason(fund, investment_horizon)
                })

            return {
                "success": True,
                "recommendations": formatted_recs,
                "total_found": len(all_funds),
                "criteria": {
                    "risk_profile": risk_profile,
                    "investment_horizon": investment_horizon,
                    "investment_amount": investment_amount,
                    "sectors": sectors,
                    "category": category_preference
                }
            }

        except Exception as e:
            self.logger.error(f"Error getting fund recommendations: {e}")
            return {"success": False, "error": str(e), "recommendations": []}

    def _calculate_fund_score(
        self,
        fund: Dict[str, Any],
        horizon: str,
        preferred_sectors: Optional[List[str]] = None
    ) -> float:
        """Calculate recommendation score for a fund based on returns and risk metrics"""
        score = 0.0
        returns = fund.get('trailing_returns_cagr_percent', {})
        risk_metrics = fund.get('risk_metrics_est', {})

        # Score based on returns and horizon (weight: 50%)
        if horizon == "short":
            ret_1y = returns.get('1y')
            if ret_1y is not None:
                score += ret_1y * 2.0  # Emphasize short-term returns
        elif horizon == "medium":
            ret_3y = returns.get('3y')
            if ret_3y is not None:
                score += ret_3y * 1.5
            else:
                ret_1y = returns.get('1y')
                if ret_1y is not None:
                    score += ret_1y * 1.0
        elif horizon == "long":
            ret_5y = returns.get('5y')
            if ret_5y is not None:
                score += ret_5y * 1.8
            else:
                ret_3y = returns.get('3y')
                if ret_3y is not None:
                    score += ret_3y * 1.2

        # Bonus for risk-adjusted returns (weight: 30%)
        sharpe = risk_metrics.get('sharpe', 0)
        alpha = risk_metrics.get('alpha', 0)

        if sharpe:
            score += sharpe * 10  # Sharpe ratio bonus

        if alpha and alpha > 0:
            score += alpha * 2  # Alpha generation bonus

        # Bonus for index funds (lower cost) (weight: 10%)
        if fund.get('is_index_fund'):
            score += 5

        # Bonus for sector/tag match (weight: 10%)
        if preferred_sectors:
            tags = fund.get('tags', [])
            tags_str = ','.join(tags).lower()
            if any(s.lower() in tags_str for s in preferred_sectors):
                score += 10

        return round(score, 2)

    def _generate_reason(self, fund: Dict[str, Any], horizon: str) -> str:
        """Generate human-readable reason for recommendation"""
        reasons = []
        returns = fund.get('trailing_returns_cagr_percent', {})
        risk_metrics = fund.get('risk_metrics_est', {})

        # Add return-based reason
        if horizon == "short" and returns.get('1y') is not None:
            reasons.append(f"1Y return: {returns['1y']}%")
        elif horizon == "medium" and returns.get('3y') is not None:
            reasons.append(f"3Y CAGR: {returns['3y']}%")
        elif horizon == "long" and returns.get('5y') is not None:
            reasons.append(f"5Y CAGR: {returns['5y']}%")

        # Add risk metric reasons
        if risk_metrics.get('sharpe', 0) > 0.8:
            reasons.append(f"Good risk-adjusted returns (Sharpe: {risk_metrics['sharpe']})")

        if risk_metrics.get('alpha', 0) > 3:
            reasons.append(f"Strong alpha generation ({risk_metrics['alpha']}%)")

        # Add fund type
        if fund.get('is_index_fund'):
            reasons.append("Low-cost index fund")
        else:
            reasons.append("Active fund with potential for outperformance")

        return "; ".join(reasons[:3]) if reasons else "Good overall performance"


# Global instance
mf_knowledge = MutualFundKnowledge()


def get_mutual_fund_recommendations(
    user_id: str,
    user_profile: Optional[Dict[str, Any]] = None,
    query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main function to get mutual fund recommendations for a user

    Args:
        user_id: User ID
        user_profile: Optional user profile with risk tolerance, goals, etc.
        query: Natural language query from user
    """
    # Extract preferences from user profile or use defaults
    risk_profile = (user_profile or {}).get('risk_tolerance', 'moderate')
    investment_horizon = (user_profile or {}).get('investment_horizon', 'medium')
    investment_amount = (user_profile or {}).get('investment_amount', 10000)
    sectors = (user_profile or {}).get('preferred_sectors', None)
    category = (user_profile or {}).get('category_preference', None)
    specific_categories = (user_profile or {}).get('specific_categories', None)

    # Get recommendations
    result = mf_knowledge.get_fund_recommendations(
        user_id=user_id,
        risk_profile=risk_profile,
        investment_horizon=investment_horizon,
        investment_amount=investment_amount,
        sectors=sectors,
        category_preference=category,
        specific_categories=specific_categories
    )

    return result
