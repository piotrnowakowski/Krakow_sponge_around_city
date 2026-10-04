"""Run the whole data pipeline: python pipeline/run_all.py"""
import catchments
import download
import drought
import layers
import meanders
import lidar_pilot
import retention
import validate

if __name__ == "__main__":
    for step in (download, catchments, validate, layers, meanders, retention, lidar_pilot, drought):
        print(f"\n=== {step.__name__} ===")
        step.main()
