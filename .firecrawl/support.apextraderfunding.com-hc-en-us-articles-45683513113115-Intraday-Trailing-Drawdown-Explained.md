## Search

# Intraday Trailing Drawdown Explained

|     |
| --- |
| ### Intraday Trailing Drawdown at a Glance:<br>- Defines the maximum total drawdown allowed on your account<br>- Adjusts in real time based on the account’s highest balance (Peak Balance)<br>- Peak Balance includes both realized and unrealized gains<br>- Threshold only moves upward only, it never moves down<br>- If breached, positions liquidate automatically and the Evaluation fails or PA closes<br>- In Performance Accounts, trailing stops once Starting Balance + $100 is reached |

## What Is the Intraday Trailing Drawdown?

The Intraday Trailing Drawdown sets the lowest balance your account may reach at any moment during the trading session. This level is called the Intraday Trailing Threshold.

The threshold follows the account’s highest intraday balance (Peak Balance). As a new Peak Balance is reached, the threshold moves upward. It maintains a fixed dollar distance behind the peak based on account size and never decreases, even if the account balance later declines.

The threshold is enforced in real time, including unrealized PnL.

## What happens if the intraday threshold is breached

If the account balance touches or falls below the Trailing Threshold at any time, all open positions are automatically liquidated. In an Evaluation, the account fails immediately. In a Performance Account, the account closes immediately.

## Why the Intraday Trailing Drawdown Exists

The Intraday Trailing Drawdown protects the account from excessive losses while locking in progress as profits grow. As the account balance increases, risk protection strengthens automatically. This structure encourages disciplined, controlled trading behavior.

## How the Intraday Trailing Threshold Is Calculated

The Trailing Threshold updates continuously throughout the trading session. It follows the Peak Balance, which includes both realized and unrealized gains.

The trailing distance is determined by account size:

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| Evaluation Account Sizes | 25K | 50K | 100K | 150K |
| Max Intraday Drawdown | $1,000 | $2,000 | $3,000 | $4,000 |

**Real-Time Intraday Trailing Example**

**$50,000 Evaluation Example:**

**Starting Balance:** $50,000

**Max Intraday Trailing Drawdown:** $2,000

Initial Threshold:

$50,000 − $2,000 = $48,000

If unrealized profit raises the balance to $50,900, a new Peak Balance is established. The new threshold becomes:

$50,900 − $2,000 = $48,900

The threshold adjusts immediately. No closing trade is required.

If the balance later declines to $50,200, the threshold remains $48,900. It does not move downward.

If the trade closes at $50,300, the Peak Balance remains $50,900 and the threshold remains $48,900.

## Intraday Threshold Stops Trailing

**Performance Accounts**

Once the Intraday Threshold reaches Starting Balance + $100, it stops increasing.

Example for a 50K Intraday PA:

Threshold Stop Level = $50,100

This occurs when the highest balance, whether realized or unrealized, reaches $52,100 (Starting Balance + Max Drawdown + $100). From that point onward, the Intraday Threshold remains fixed at $50,100.

**Evaluations Rithmic and Wealthcharts**

Intraday Threshold stops trailing and becomes fixed when it reaches an amount equal to the Target Profit balance.

Example for a 50K Rithmic and Wealthcharts Intraday Evaluation account:

Threshold Stop Level = $53.000

This occurs when the highest balance, whether realized or unrealized, reaches $55,000 (Profit Target Balance + Max Drawdown). From that point onward, the Intraday Threshold remains fixed at $53,000.

**Evaluations Tradovate**

Intraday Drawdown trails indefinitely with the peak account balance.

* * *

## Frequently Asked Questions

**Do I fail if I reach the Intraday Trailing Threshold?**

Yes. If your account balance touches or falls below the Intraday Drawdown at any time, all open positions are automatically liquidated.

In an Evaluation, the account fails immediately.

In a Performance Account, the account closes immediately.

**Does unrealized profit move the Trailing Threshold?**

Yes. The Peak Balance includes both realized and unrealized gains. If an open trade pushes your account to a new high, the Trailing Threshold adjusts upward immediately even if the position is not closed.

**Does the Trailing Threshold ever move down?**

No. Once the threshold moves up due to a new Peak Balance, it never moves down — even if the account later declines.

**Does the Intraday Trailing Drawdown reset each day?**

The Intraday Trailing Threshold follows the highest balance achieved and does not reset daily.

**What happens if liquidation fills slightly below the threshold?**

Liquidations occur at market price. Depending on liquidity and price movement at the time of execution, the final filled balance may be slightly above or slightly below the threshold.

This does not change the outcome. Once the threshold is touched, the account is considered breached.

**When does trailing stop in a Performance Account?**

In Performance Accounts, trailing stops once the Intraday Threshold reaches Starting Balance + $100.

For example, on a $50,000 account, the threshold stop level is $50,100. Once this level is reached, the threshold no longer increases.

**When does trailing stop in Evaluations (Rithmic and Wealthcharts)?**

In Rithmic and Wealthcharts Evaluations, trailing stops once the Intraday Threshold reaches Profit Target Balance + $2,000.

For example, on a $50,000 account with a $3,000 profit target:

Profit Target Balance = $53,000

Threshold locks when balance reaches = $55,000

Final Threshold Stop Level = $53,000

Once the account reaches $55,000, the threshold fixes at $53,000 and no longer trails.

**Does trailing stop in Tradovate Evaluations?**

No. In Tradovate Evaluations, the Intraday Trailing Drawdown continues to trail indefinitely with the Peak Balance and does not stop at a fixed level.

**Can my account dip below the threshold and recover?**

No. If the account balance touches or drops below the threshold at any moment, liquidation occurs immediately and the account fails or closes.

**Is the Intraday Trailing Drawdown the same as a Daily Loss Limit?**

No. The Intraday Trailing Drawdown follows the highest balance achieved and enforces a maximum total drawdown.

A Daily Loss Limit resets each session and limits how much can be lost in a single trading day.

They are separate risk controls.

**Why does the Intraday Trailing Drawdown exist?**

It protects the account from excessive loss while automatically strengthening risk protection as profits grow. As your balance increases, the allowable drawdown tightens, encouraging consistent and disciplined trading.

### Can't find what you're looking for?


Our team of experts is here to help



[Contact us](https://support.apextraderfunding.com/hc/en-us/requests/new)

![](https://fonts.gstatic.com/s/i/productlogos/translate/v14/24px.svg)

Original text

Rate this translation

Your feedback will be used to help improve Google Translate