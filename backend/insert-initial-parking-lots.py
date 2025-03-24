import sqlite3

DATABASE = "parking.db"

conn = sqlite3.connect(DATABASE)
c = conn.cursor()

parking_lots = [
    # name, location, capacity, evSlots, reserved_slots
    
    # Main Campus West (Total 6995)
    ("Lot 1 Admin Overflow", "Main Campus West", 676, 0, 0),
    ("Lot 2 M & H", "Main Campus West", 436, 0, 0),
    ("Lot 2 State/SS Sction", "Main Campus West", 14, 0, 0), # EV by section
    ("Lot 3  Stadium (EV Charging)", "Main Campus West", 977, 0, 0),
    ("3A", "Main Campus West", 50, 0, 0),
    ("3B", "Main Campus West", 123, 0, 0),
    ("3C", "Main Campus West", 129, 0, 0),
    ("3D", "Main Campus West", 148, 0, 0),
    ("3D", "Main Campus West", 112, 0, 2),
    ("3F", "Main Campus West", 80, 0, 0),
    ("3G", "Main Campus West", 80, 0, 0),
    ("3H", "Main Campus West", 83, 0, 0),
    ("3I", "Main Campus West", 81, 0, 0),
    ("3J (including back of student health)", "Main Campus West", 91, 0, 0),
    ("Lot 4 Union Metered Lot", "Main Campus West", 68, 0, 0),
    ("Staller/East Side Dining Service Areas", "Main Campus West", 25, 0, 0),
    ("Lot 5 North P", "Main Campus West", 510, 0, 0), # EV by section
    ("5A", "Main Campus West", 126, 0, 0),
    ("5B", "Main Campus West", 384, 0, 0),
    ("Lot 6 Gym Road", "Main Campus West", 370, 0, 0), # EV by section
    ("6A", "Main Campus West", 191, 0, 0),
    ("6B", "Main Campus West", 139, 0, 0),
    ("6C", "Main Campus West", 14, 0, 0),
    ("6D", "Main Campus West", 26, 0, 4),
    ("Lot 7 ISC Metered Lot (EV Charging)", "Main Campus West", 162, 0, 0),
    ("Lot 7 (Behind IF Arena)", "Main Campus West", 23, 0, 0),
    ("Lot 9 COM Business Office/CoGen", "Main Campus West", 135, 0, 0), # EV by section
    ("9A *inlcudes area across from loading dock", "Main Campus West", 102, 0, 0),
    ("9B *central receiving and SBVAC lot", "Main Campus West", 33, 0, 0),
    ("Lot 10 Simons Gated Lot", "Main Campus West", 39, 0, 0),
    ("Lot 11 Math/Physics Lot", "Main Campus West", 108, 0, 0),
    ("Lot 12 Old H Metered", "Main Campus West", 16, 0, 0),
    ("Lot 13 Old H", "Main Campus West", 547, 0, 0),
    ("Lot 13 A ESS (EV Charging)", "Main Campus West", 21, 0, 2),
    ("Lot 14 Automotive/COM Compound (EV State Only)", "Main Campus West", 152, 0, 0), # EV by section
    ("14A", "Main Campus West", 55, 0, 0),
    ("14B", "Main Campus West", 69, 0, 2), # EV State Only
    ("14C", "Main Campus West", 8, 0, 0),
    ("14D", "Main Campus West", 20, 0, 0),
    ("Lot 15 Lower Kelly", "Main Campus West", 160, 0, 0),
    ("Lot 16 Computer Center (24 Hour Restricted)", "Main Campus West", 78, 0, 0), # EV by section
    ("16A", "Main Campus West", 42, 0, 0),
    ("16B", "Main Campus West", 38, 0, 0),
    ("Lot 17  West Apartments", "Main Campus West", 1104, 0, 0), # EV by section
    ("17A", "Main Campus West", 90, 0, 0),
    ("Along Curb from 17A-17B", "Main Campus West", 52, 0, 0),
    ("17B", "Main Campus West", 30, 0, 0),
    ("17C", "Main Campus West", 197, 0, 0),
    ("17D", "Main Campus West", 104, 0, 0),
    ("17E", "Main Campus West", 187, 0, 0),
    ("17F", "Main Campus West", 102, 0, 0),
    ("17G", "Main Campus West", 124, 0, 0),
    ("17H", "Main Campus West", 79, 0, 0),
    ("17I", "Main Campus West", 139, 0, 0),
    ("Lot 18 Heavy Engineering (EV Charging)", "Main Campus West", 57, 0, 2),
    ("Lot 19 SAC Metered", "Main Campus West", 40, 0, 0),
    ("Lot 19 State/Special Service Area", "Main Campus West", 19, 0, 0),
    ("Communications Gated Lot", "Main Campus West", 16, 0, 0),
    ("Engineering Gated Lot", "Main Campus West", 8, 0, 0),
    ("Lot 20 Cardozo Metered", "Main Campus West", 31, 0, 0),
    ("Lot 21 Tabler Community", "Main Campus West", 363, 0, 0), # EV by section
    ("21B", "Main Campus West", 51, 0, 0),
    ("21C", "Main Campus West", 47, 0, 0),
    ("21D", "Main Campus West", 39, 0, 0),
    ("21E", "Main Campus West", 108, 0, 0),
    ("21F", "Main Campus West", 43, 0, 0),
    ("21G", "Main Campus West", 68, 0, 0),
    ("Tabler Service Area (between F&G)", "Main Campus West", 7, 0, 0),
    ("Lot 22 Tabler Metered (EV Charging)", "Main Campus West", 12, 0, 2),
    ("Lot 23 Tabler", "Main Campus West", 342, 0, 0),
    ("Lot 24 Roth/Lake Drive", "Main Campus West", 270, 0, 0), # EV by section
    ("24A", "Main Campus West", 96, 0, 0),
    ("24B", "Main Campus West", 56, 0, 0),
    ("24C Gated", "Main Campus West", 50, 0, 0),
    ("24D", "Main Campus West", 36, 0, 0),
    ("24E", "Main Campus West", 32, 0, 0),
    ("Lot 25 Lake Drive Metered (EV Charging)", "Main Campus West", 20, 0, 2),
    ("Lot 26 Life Sciences Metered (EV Charging)", "Main Campus West", 101, 0, 2),
    ("Lot 27 Life Sciences Premium A & B", "Main Campus West", 24, 0, 0),
    ("Office of Disabilities ADA Only Lot", "Main Campus West", 17, 0, 0),
    ("Wang Center Special Service Lot", "Main Campus West", 5, 0, 0),
    ("Lot 28 Humanities Metered Admin Special Service", "Main Campus West", 49, 0, 0),
    
    # Main Campus Admin Gargae (Total 900)
    ("Main Campus Admin Gargae Level 1", "Main Campus Admin Gargae", 207, 0, 0),
    ("Main Campus Admin Gargae Ramp to L2", "Main Campus Admin Gargae", 53, 0, 0),
    ("Main Campus Admin Gargae Level 2", "Main Campus Admin Gargae", 224, 0, 0),
    ("Main Campus Admin Gargae Ramp to L3", "Main Campus Admin Gargae", 59, 0, 0),
    ("Main Campus Admin Gargae Level 3", "Main Campus Admin Gargae", 224, 0, 0),
    ("Main Campus Admin Gargae Ramp to R", "Main Campus Admin Gargae", 67, 0, 0),
    ("Main Campus Admin Gargae Roof", "Main Campus Admin Gargae", 66, 0, 0),
    
    # South Campus (Total 3177)
    ("Lot 30 South Campus Metered", "South Campus", 5, 0, 0),
    ("Lot 31 South Campus Rockland Hall", "South Campus", 79, 0, 0),
    ("Lot 31 Rockland Hall Half Circle Lot", "South Campus", 8, 0, 0),
    ("Lot 32 SoMAS", "South Campus", 49, 0, 0),
    ("Lot 33 SoMAS", "South Campus", 18, 0, 0),
    ("Lot 34 Dana", "South Campus", 65, 0, 0),
    ("Lot 35 Putnam", "South Campus", 82, 0, 0),
    ("Lot 36 Nassau/Suffolk", "South Campus", 71, 0, 0),
    ("Lot 37 Across from Fire Area", "South Campus", 40, 0, 0),
    ("Lot 38A Dental School", "South Campus", 250, 0, 0),
    ("Lot 38B Side of Dental", "South Campus", 72, 0, 0),
    ("Lot 40 South P", "South Campus", 2438, 0, 0),
    
    # R & D Campus (Total 975)
    ("Lot 50 AERTC (EV Charging)", "R & D Campus", 55, 0, 4),
    ("Lot 51 CEWIT", "R & D Campus", 208, 0, 0),
    ("Lot 52 IDC", "R & D Campus", 200, 0, 2),
    ("Lot 53 R & D Lower/Staff Lot B", "R & D Campus", 458, 0, 0),
    ("Lot 54 R & D Upper", "R & D Campus", 54, 0, 0),
    
    # East Campus (Total 2608)
    ("Lot A Staff Lot A", "East Campus", 699, 0, 0),
    ("Lot B Amb/Surg East", "East Campus", 125, 0, 0),
    ("Lot C Amb/Surg Doctors Lot", "East Campus", 30, 0, 0),
    ("Lot D Amb/Surg West", "East Campus", 245, 0, 0),
    ("Lot E Emergency/Helipad (paved area)", "East Campus", 26, 0, 0),
    ("CPEP Area Near Ambulance Bay", "East Campus", 72, 0, 0),
    ("Lot F1 Rad Onc", "East Campus", 194, 0, 0),
    ("Lot F2 Rad/Onc Nested", "East Campus", 31, 0, 0),
    ("Lot F Rad Onc Garage Open Lot", "East Campus", 44, 0, 0),
    ("Lot F Rad Onc Garage", "East Campus", 132, 0, 0),
    ("Lot G Chapin Apts", "East Campus", 271, 0, 0),
    ("HSC Open Lot", "East Campus", 434, 0, 0),
    ("HPG Open Lot", "East Campus", 305, 0, 0),
    
    # East Campus HPG (Total 1212)
    ("Hospital Parking Garage Level 1", "Hospital Parking Garage", 322, 0, 0),
    ("Hospital Parking Garage Ramp to L2", "Hospital Parking Garage", 28, 0, 0),
    ("Hospital Parking Garage Level 2", "Hospital Parking Garage", 381, 0, 0),
    ("Hospital Parking Garage Ramp to R", "Hospital Parking Garage", 44, 0, 0),
    ("Hospital Parking Garage Roof", "Hospital Parking Garage", 437, 0, 0),
    
    # East Campus HSC (Total 1879)
    ("HSC Parking Garage Level 1", "HSC Parking Garage", 546, 0, 0),
    ("HSC Parking Garage Level 2", "HSC Parking Garage", 703, 0, 0),
    ("HSC Parking Garage Level 3 (Roof)", "HSC Parking Garage", 630, 0, 0),
]

c.executemany("""
    INSERT OR REPLACE INTO parking_lots (name, location, capacity, evSlots, reserved_slots)
    VALUES (?, ?, ?, ?, ?)
""", parking_lots)

conn.commit()
conn.close()