#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Xml.Serialization;
using System.Windows.Media;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.Tools;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

namespace NinjaTrader.NinjaScript.Indicators
{
    public class VolumeFilter : Indicator
    {
        private SMA volMedia;

        [Browsable(false)]

        [XmlIgnore]

        public double VolumeAtual { get; private set; }
        [Browsable(false)]
        [XmlIgnore]
        public double MediaVolume { get; private set; }
        [Browsable(false)]
        [XmlIgnore]
        public double Razao { get; private set; }
        public bool VolumeAlto => Razao >= Multiplier;
        public bool VolumeAbaixoMedia => Razao < 1.0;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "Volume colorido + media movel. Verde=alto, cinza=medio, vermelho=baixo.";
                Name = "VolumeFilter";
                Calculate = Calculate.OnPriceChange;
                IsOverlay = false;
                DisplayInDataBox = true;
                DrawOnPricePanel = false;
                ScaleJustification = NinjaTrader.Gui.Chart.ScaleJustification.Right;
                IsSuspendedWhileInactive = false;

                Period = 20;
                Multiplier = 1.5;

                AddPlot(new Stroke(Brushes.Gray, 2), PlotStyle.Bar, "Volume");
                AddPlot(new Stroke(Brushes.Yellow, 2), PlotStyle.Line, "Media");
            }
            else if (State == State.DataLoaded)
            {
                volMedia = SMA(Volume, Period);
            }
        }

        // ============================================================
        // EXPIRACAO - VolumeFilter brinde gratuito Markets Coupons
        // Esta versao expira em 31/12/2026. Renove em marketscoupons.com
        // ============================================================
        private static readonly DateTime ExpiraEm = new DateTime(2026, 12, 31, 23, 59, 59);

        protected override void OnBarUpdate()
        {
            // Checagem de expiracao
            if (DateTime.Now > ExpiraEm)
            {
                Draw.TextFixed(this, "VolumeFilterExpirado",
                    "VolumeFilter expirou em " + ExpiraEm.ToString("dd/MM/yyyy") + Environment.NewLine +
                    "Renove em: marketscoupons.com",
                    TextPosition.Center,
                    Brushes.OrangeRed,
                    new SimpleFont("Consolas", 14) { Bold = true },
                    Brushes.Black, Brushes.Black, 90);
                return;
            }

            if (CurrentBar < Period) return;

            VolumeAtual = Volume[0];
            MediaVolume = volMedia[0];

            if (MediaVolume <= 0)
            {
                Razao = 0;
                return;
            }

            Razao = VolumeAtual / MediaVolume;

            Values[0][0] = VolumeAtual;
            Values[1][0] = MediaVolume;

            if (Razao >= Multiplier)
                PlotBrushes[0][0] = Brushes.LimeGreen;
            else if (Razao < 1.0)
                PlotBrushes[0][0] = Brushes.DarkRed;
            else
                PlotBrushes[0][0] = Brushes.Gray;
        }

        #region Properties
        [NinjaScriptProperty]
        [Range(2, 100)]
        [Display(Name = "Periodo da media", Order = 1, GroupName = "Parametros")]
        public int Period { get; set; }

        [NinjaScriptProperty]
        [Range(1.0, 5.0)]
        [Display(Name = "Multiplicador (volume alto)", Description = "Volume precisa ser N x a media para ser considerado alto", Order = 2, GroupName = "Parametros")]
        public double Multiplier { get; set; }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> Vol => Values[0];

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> MediaVol => Values[1];
        #endregion
    }
}

#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private VolumeFilter[] cacheVolumeFilter;
		public VolumeFilter VolumeFilter(int period, double multiplier)
		{
			return VolumeFilter(Input, period, multiplier);
		}

		public VolumeFilter VolumeFilter(ISeries<double> input, int period, double multiplier)
		{
			if (cacheVolumeFilter != null)
				for (int idx = 0; idx < cacheVolumeFilter.Length; idx++)
					if (cacheVolumeFilter[idx] != null && cacheVolumeFilter[idx].Period == period && cacheVolumeFilter[idx].Multiplier == multiplier && cacheVolumeFilter[idx].EqualsInput(input))
						return cacheVolumeFilter[idx];
			return CacheIndicator<VolumeFilter>(new VolumeFilter(){ Period = period, Multiplier = multiplier }, input, ref cacheVolumeFilter);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.VolumeFilter VolumeFilter(int period, double multiplier)
		{
			return indicator.VolumeFilter(Input, period, multiplier);
		}

		public Indicators.VolumeFilter VolumeFilter(ISeries<double> input , int period, double multiplier)
		{
			return indicator.VolumeFilter(input, period, multiplier);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.VolumeFilter VolumeFilter(int period, double multiplier)
		{
			return indicator.VolumeFilter(Input, period, multiplier);
		}

		public Indicators.VolumeFilter VolumeFilter(ISeries<double> input , int period, double multiplier)
		{
			return indicator.VolumeFilter(input, period, multiplier);
		}
	}
}

#endregion
